/*
 * ShulePlus Gate Reader — production-oriented offline-first firmware
 * Hardware:
 *   XIAO ESP32-C3 + MFRC522 RFID + RGB LED + buzzer
 *
 * Design:
 *   - RFID scanning stays in the main loop.
 *   - Network/HTTPS runs in a FreeRTOS background task.
 *   - Taps are persisted locally before being reported as accepted.
 *   - Queue metadata uses two journaled headers with CRC.
 *   - Queue records contain a unique event ID for server-side idempotency.
 *   - Failed/ambiguous HTTPS requests are NOT removed from the queue.
 *   - Wi-Fi reconnect is recoverable and does not stop RFID polling.
 *   - NTP is non-blocking from the RFID path.
 *   - Tap time uses SNTP when available; otherwise last-known epoch + millis().
 *     Without any prior sync, scannedAt is omitted and the server uses sync time.
 *   - AP provisioning is protected by a device-specific password.
 *
 * IMPORTANT SERVER CONTRACT:
 *   /api/gate_attendance/batch must treat "eventId" as an idempotency key.
 *   Re-sending an eventId after an uncertain network result must NOT create
 *   a second attendance record.
 *
 * Existing API endpoints retained:
 *   GET  https://attendance-api.shuleplus.rw/api/device_config
 *   POST https://attendance-api.shuleplus.rw/api/gate_attendance/batch
 *   POST https://attendance-api.shuleplus.rw/api/device_heartbeat
 *
 * Existing request authentication retained:
 *   x-api-key: API_KEY
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>
#include <Preferences.h>
#include <LittleFS.h>
#include <SPI.h>
#include <MFRC522.h>
#include <time.h>
#include <sys/time.h>
#include <esp_system.h>
#include <esp_task_wdt.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>

// ============================================================
// DEVICE CREDENTIALS
// ============================================================

const char* DEVICE_ID = "21002_003";
const char* API_KEY   = "att_84c5bdae72660e83c6b9b2cfdf3019f4";

// ============================================================
// SERVER
// ============================================================

const char* API_HOST       = "attendance-api.shuleplus.rw";
const char* CONFIG_URL     = "https://attendance-api.shuleplus.rw/api/device_config";
const char* GATE_BATCH_URL = "https://attendance-api.shuleplus.rw/api/gate_attendance/batch";
const char* HEARTBEAT_URL  = "https://attendance-api.shuleplus.rw/api/device_heartbeat";

// ============================================================
// SECURITY / PROVISIONING
// ============================================================

const char* AP_PASSWORD_BASE = "shuleplus";  // fixed easy password for school setup

// ============================================================
// TIMING
// ============================================================

constexpr uint32_t HEARTBEAT_INTERVAL_MS      = 60000UL;
constexpr uint32_t CONFIG_SYNC_INTERVAL_MS    = 300000UL;
constexpr uint32_t WIFI_CONNECT_TIMEOUT_MS     = 15000UL;
constexpr uint32_t WIFI_RETRY_INTERVAL_MS      = 8000UL;
constexpr uint8_t  WIFI_FAILS_BEFORE_SLOW      = 3;  // then retry slowly so the setup page stays usable
constexpr uint32_t WIFI_SLOW_RETRY_INTERVAL_MS = 30000UL;
constexpr uint32_t QUEUE_RETRY_INTERVAL_MS     = 5000UL;
constexpr uint32_t SAME_CARD_COOLDOWN_MS       = 1000UL;
constexpr uint32_t CARD_REMOVE_TIMEOUT_MS      = 700UL;
constexpr uint32_t NTP_RETRY_INTERVAL_MS       = 30000UL;
constexpr uint32_t SYNC_HTTP_TIMEOUT_MS        = 15000UL;  // slow school links need time for TLS
constexpr uint32_t CONFIG_HTTP_TIMEOUT_MS      = 15000UL;
constexpr uint32_t NET_DIAG_INTERVAL_MS        = 60000UL;
constexpr uint32_t HTTP_RESPONSE_LIMIT         = 8192UL;
constexpr uint32_t LED_RESULT_HOLD_MS            = 120UL;  // errors / storage — brief only
constexpr uint32_t LED_RESULT_QUEUED_HOLD_MS     = 35UL;   // success tap — minimal green flash
constexpr uint16_t BUZZ_PULSE_ON_MS            = 22;       // single tick (~22 ms)
constexpr uint16_t BUZZ_PULSE_OFF_MS           = 18;
constexpr uint16_t BUZZ_ERROR_PULSE_OFF_MS       = 18;
constexpr uint8_t  BUZZ_QUEUED_PULSES          = 1;      // one beep per accepted tap
constexpr uint8_t  BUZZ_ERROR_PULSES           = 2;
constexpr uint8_t  EVENT_SEQ_PERSIST_EVERY     = 25;  // bootId keeps IDs unique between saves
constexpr uint32_t STORAGE_RETRY_INTERVAL_MS   = 10000UL;
constexpr uint32_t NETWORK_TASK_DELAY_MS       = 20UL;

// ============================================================
// PINS
// ============================================================

constexpr uint8_t RGB_PIN_R = 6;
constexpr uint8_t RGB_PIN_G = 7;
constexpr uint8_t RGB_PIN_B = 3;
constexpr bool RGB_COMMON_ANODE = false;

constexpr uint8_t MFRC522_SCK  = 8;
constexpr uint8_t MFRC522_MISO = 9;
constexpr uint8_t MFRC522_MOSI = 10;
constexpr uint8_t MFRC522_SS   = 21;
constexpr uint8_t MFRC522_RST  = 5;

constexpr uint8_t BUZZER_PIN = 4;

// ============================================================
// QUEUE
// ============================================================

constexpr uint16_t OFFLINE_CAP_DEFAULT = 1500;
constexpr uint16_t OFFLINE_CAP_MIN     = 100;
constexpr uint16_t OFFLINE_CAP_MAX     = 5000;

constexpr uint32_t QUEUE_MAGIC = 0x53514C33UL;
constexpr uint16_t QUEUE_VERSION = 3;

const char* QUEUE_PATH = "/att_queue.bin";
const char* QUEUE_TMP  = "/att_queue.tmp";

constexpr uint8_t HEADER_SLOT_COUNT = 2;

constexpr size_t UID_TEXT_SIZE = 21;
constexpr size_t EVENT_ID_SIZE = 41;

struct __attribute__((packed)) OfflineTap {
  char uid[UID_TEXT_SIZE];
  uint32_t epoch;
  uint32_t sequence;
  char eventId[EVENT_ID_SIZE];
};

struct __attribute__((packed)) QueueHeader {
  uint32_t magic;
  uint16_t version;
  uint16_t capacity;
  uint16_t count;
  uint16_t head;
  uint32_t generation;
  uint32_t crc;
};

static_assert(sizeof(OfflineTap) == 70, "Unexpected OfflineTap size");

// ============================================================
// GLOBALS
// ============================================================

WebServer server(80);
Preferences preferences;
MFRC522 rfid(MFRC522_SS, MFRC522_RST);

SemaphoreHandle_t queueMutex = nullptr;
SemaphoreHandle_t stateMutex = nullptr;

TaskHandle_t networkTaskHandle = nullptr;

volatile bool portalActive = false;
volatile bool networkTaskRunning = false;
volatile bool wifiConnected = false;
volatile bool storageReady = false;
volatile bool provisioningRequested = false;

bool ntpReady = false;
bool ntpStarted = false;

/** Last wall time from SNTP; extrapolated with millis() when Wi-Fi is down. */
uint32_t timeAnchorEpoch = 0;
uint32_t timeAnchorMillis = 0;
unsigned long lastEpochPersistMs = 0;

unsigned long lastCardRead = 0;
unsigned long lastNtpAttempt = 0;
unsigned long lastStorageRetry = 0;
uint8_t wifiFailCount = 0;
bool littleFsFormattedOnce = false;

unsigned long ledHoldUntil = 0;
unsigned long lastNetworkPulseMs = 0;
bool networkPulseOn = true;

enum LedResult {
  LED_RESULT_NONE = 0,
  LED_RESULT_QUEUED,
  LED_RESULT_ERROR,
  LED_RESULT_STORAGE_ERROR
};

LedResult activeLedResult = LED_RESULT_NONE;

uint16_t offlineCount = 0;
uint16_t offlineCapacity = OFFLINE_CAP_DEFAULT;
uint16_t queueHeadIndex = 0;

uint32_t queueGeneration = 0;
uint32_t eventSequence = 0;
uint32_t bootId = 0;

String lastUid = "";
bool cardPresent = false;
unsigned long lastSeenCard = 0;

// ============================================================
// UTILITY
// ============================================================

static bool elapsedMs(
    uint32_t now,
    uint32_t since,
    uint32_t duration) {

  return (uint32_t)(now - since) >= duration;
}

static uint32_t crc32Bytes(
    const uint8_t* data,
    size_t len) {

  uint32_t crc = 0xFFFFFFFFUL;

  for (size_t i = 0; i < len; ++i) {

    crc ^= data[i];

    for (uint8_t j = 0; j < 8; ++j) {

      uint32_t mask = -(crc & 1UL);

      crc = (crc >> 1) ^
            (0xEDB88320UL & mask);
    }
  }

  return ~crc;
}

static uint32_t headerCrc(
    const QueueHeader& h) {

  QueueHeader temp = h;
  temp.crc = 0;

  return crc32Bytes(
      reinterpret_cast<const uint8_t*>(&temp),
      sizeof(temp));
}

static bool validHeader(
    const QueueHeader& h) {

  if (h.magic != QUEUE_MAGIC) return false;
  if (h.version != QUEUE_VERSION) return false;

  if (h.capacity < OFFLINE_CAP_MIN ||
      h.capacity > OFFLINE_CAP_MAX) {

    return false;
  }

  if (h.count > h.capacity) return false;
  if (h.head >= h.capacity) return false;

  return h.crc == headerCrc(h);
}

static String deviceEventPrefix() {

  String s = String(DEVICE_ID);

  s.replace("-", "");
  s.replace("_", "");

  return s;
}

static String makeEventId(
    uint32_t seq) {

  char buf[EVENT_ID_SIZE];

  snprintf(
      buf,
      sizeof(buf),
      "%s-%08lX-%08lX",
      deviceEventPrefix().c_str(),
      (unsigned long)bootId,
      (unsigned long)seq);

  return String(buf);
}

// ============================================================
// RGB LED
// ============================================================

void rgbWritePin(
    uint8_t pin,
    bool on) {

  digitalWrite(
      pin,
      RGB_COMMON_ANODE
          ? (on ? LOW : HIGH)
          : (on ? HIGH : LOW));
}

void setColor(
    bool r,
    bool g,
    bool b) {

  rgbWritePin(RGB_PIN_R, r);
  rgbWritePin(RGB_PIN_G, g);
  rgbWritePin(RGB_PIN_B, b);
}

void colorOff() {
  setColor(false, false, false);
}

void colorRed() {
  setColor(true, false, false);
}

void colorGreen() {
  setColor(false, true, false);
}

void colorBlue() {
  setColor(false, false, true);
}

bool isNetworkConnected() {

  return WiFi.status() == WL_CONNECTED;
}

void showNetworkLed() {

  if (isNetworkConnected()) {
    colorBlue();
  } else {
    colorRed();
  }
}

void showLedResult(
    uint8_t result,
    uint32_t holdMs = LED_RESULT_HOLD_MS) {

  activeLedResult = static_cast<LedResult>(result);
  ledHoldUntil = millis() + holdMs;

  switch (result) {

    case LED_RESULT_QUEUED:
      colorGreen();
      break;

    case LED_RESULT_ERROR:
    case LED_RESULT_STORAGE_ERROR:
      colorRed();
      break;

    default:
      showNetworkLed();
      break;
  }
}

void updateStatusLed() {

  uint32_t now = millis();

  if (activeLedResult != LED_RESULT_NONE) {

    if (now < ledHoldUntil) {
      return;
    }

    activeLedResult = LED_RESULT_NONE;
  }

  const uint32_t period =
      isNetworkConnected()
          ? 1400UL
          : 700UL;

  if (elapsedMs(
          now,
          lastNetworkPulseMs,
          period)) {

    lastNetworkPulseMs = now;
    networkPulseOn = !networkPulseOn;
  }

  if (networkPulseOn) {
    showNetworkLed();
  } else {
    colorOff();
  }
}

void setupRGB() {

  pinMode(RGB_PIN_R, OUTPUT);
  pinMode(RGB_PIN_G, OUTPUT);
  pinMode(RGB_PIN_B, OUTPUT);

  colorOff();
}

// ============================================================
// NON-BLOCKING BUZZER
// ============================================================

enum BuzzerPattern {
  BUZZ_NONE = 0,
  BUZZ_READY,
  BUZZ_QUEUED,
  BUZZ_ERROR
};

struct BuzzerState {
  BuzzerPattern pattern = BUZZ_NONE;
  uint8_t step = 0;
  bool outputOn = false;
  unsigned long changedAt = 0;
};

BuzzerState buzzer;

void buzzerOff() {

  digitalWrite(
      BUZZER_PIN,
      LOW);

  buzzer.outputOn = false;
  buzzer.pattern = BUZZ_NONE;
  buzzer.step = 0;
}

/*
 * IMPORTANT:
 * Use uint8_t here instead of BuzzerPattern.
 *
 * Arduino IDE may generate an automatic function prototype
 * before enum BuzzerPattern is declared. Using uint8_t prevents
 * the "BuzzerPattern was not declared in this scope" error.
 *
 * Pin goes HIGH immediately — no waiting for updateBuzzer() / LittleFS.
 */
void startBuzzer(
    uint8_t p) {

  buzzer.pattern =
      static_cast<BuzzerPattern>(p);

  buzzer.step = 0;
  buzzer.outputOn = true;
  buzzer.changedAt = millis();

  digitalWrite(
      BUZZER_PIN,
      HIGH);
}

void updateBuzzer() {

  if (buzzer.pattern == BUZZ_NONE) {
    return;
  }

  uint32_t now = millis();

  const uint16_t shortOn = BUZZ_PULSE_ON_MS;
  const uint16_t shortOff = BUZZ_PULSE_OFF_MS;
  const uint16_t errorOff = BUZZ_ERROR_PULSE_OFF_MS;

  uint8_t maxSteps = 0;

  if (buzzer.pattern == BUZZ_READY) {
    maxSteps = 1;
  }

  if (buzzer.pattern == BUZZ_QUEUED) {
    maxSteps = BUZZ_QUEUED_PULSES;
  }

  if (buzzer.pattern == BUZZ_ERROR) {
    maxSteps = BUZZ_ERROR_PULSES;
  }

  if (buzzer.step >= maxSteps) {
    buzzerOff();
    return;
  }

  uint32_t duration = 0;

  if (buzzer.pattern == BUZZ_READY) {

    duration =
        buzzer.outputOn
            ? shortOn
            : 0;

  } else if (buzzer.pattern == BUZZ_QUEUED) {

    duration =
        buzzer.outputOn
            ? shortOn
            : shortOff;

  } else {

    duration =
        buzzer.outputOn
            ? shortOn
            : errorOff;
  }

  // Already started ON in startBuzzer() — wait for first on-duration, then toggle
  if (elapsedMs(
          now,
          buzzer.changedAt,
          duration)) {

    buzzer.changedAt = now;

    buzzer.outputOn =
        !buzzer.outputOn;

    digitalWrite(
        BUZZER_PIN,
        buzzer.outputOn
            ? HIGH
            : LOW);

    if (!buzzer.outputOn) {
      buzzer.step++;
    }
  }
}

// ============================================================
// WIFI CREDENTIALS
// ============================================================

void saveWiFiCredentials(
    const String& ssid,
    const String& password) {

  // Local instance: called from both the web server (loop) and the network task
  Preferences prefs;

  prefs.begin(
      "wifi",
      false);

  prefs.putString(
      "ssid",
      ssid);

  prefs.putString(
      "password",
      password);

  prefs.end();
}

bool loadWiFiCredentials(
    String& ssid,
    String& password) {

  Preferences prefs;

  prefs.begin(
      "wifi",
      true);

  ssid =
      prefs.getString(
          "ssid",
          "");

  password =
      prefs.getString(
          "password",
          "");

  prefs.end();

  return ssid.length() > 0;
}

void saveOfflineCapacity(
    uint16_t cap) {

  preferences.begin(
      "offline",
      false);

  preferences.putUShort(
      "capacity",
      cap);

  preferences.end();
}

uint16_t loadSavedOfflineCapacity() {

  preferences.begin(
      "offline",
      true);

  uint16_t cap =
      preferences.getUShort(
          "capacity",
          OFFLINE_CAP_DEFAULT);

  preferences.end();

  if (cap < OFFLINE_CAP_MIN) {
    cap = OFFLINE_CAP_MIN;
  }

  if (cap > OFFLINE_CAP_MAX) {
    cap = OFFLINE_CAP_MAX;
  }

  return cap;
}

uint32_t loadEventSequence() {

  preferences.begin(
      "event",
      false);

  uint32_t value =
      preferences.getULong(
          "seq",
          0);

  preferences.end();

  return value;
}

void saveLastKnownEpoch(
    uint32_t epoch) {

  preferences.begin(
      "time",
      false);

  preferences.putULong(
      "lastEpoch",
      epoch);

  preferences.end();
}

uint32_t loadLastKnownEpoch() {

  preferences.begin(
      "time",
      true);

  uint32_t epoch =
      preferences.getULong(
          "lastEpoch",
          0);

  preferences.end();

  return epoch;
}

uint32_t nextEventSequence() {

  eventSequence++;

  if (eventSequence % EVENT_SEQ_PERSIST_EVERY == 0) {

    Preferences prefs;

    prefs.begin(
        "event",
        false);

    prefs.putULong(
        "seq",
        eventSequence);

    prefs.end();
  }

  return eventSequence;
}

// ============================================================
// QUEUE FILE LAYOUT
// ============================================================

size_t headerOffset(
    uint8_t slot) {

  return (size_t)slot *
         sizeof(QueueHeader);
}

size_t recordsOffset() {

  return (size_t)HEADER_SLOT_COUNT *
         sizeof(QueueHeader);
}

size_t recordOffset(
    uint16_t physicalIndex) {

  return recordsOffset() +
         (size_t)physicalIndex *
         sizeof(OfflineTap);
}

bool lockQueue(
    uint32_t timeoutMs = 200) {

  if (!queueMutex) {
    return false;
  }

  return xSemaphoreTake(
             queueMutex,
             pdMS_TO_TICKS(timeoutMs))
         == pdTRUE;
}

void unlockQueue() {

  if (queueMutex) {
    xSemaphoreGive(queueMutex);
  }
}

bool readHeaderSlot(
    File& f,
    uint8_t slot,
    QueueHeader& out) {

  if (!f.seek(
          headerOffset(slot))) {

    return false;
  }

  size_t n =
      f.read(
          reinterpret_cast<uint8_t*>(&out),
          sizeof(out));

  return n == sizeof(out) &&
         validHeader(out);
}

bool chooseNewestHeader(
    QueueHeader& out) {

  if (!storageReady ||
      !LittleFS.exists(QUEUE_PATH)) {

    return false;
  }

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r");

  if (!f) {
    return false;
  }

  QueueHeader a{}, b{};

  bool va =
      readHeaderSlot(
          f,
          0,
          a);

  bool vb =
      readHeaderSlot(
          f,
          1,
          b);

  f.close();

  if (!va && !vb) {
    return false;
  }

  if (va && vb) {

    out =
        (a.generation >= b.generation)
            ? a
            : b;

  } else {

    out =
        va
            ? a
            : b;
  }

  return true;
}

bool writeHeaderSlot(
    uint8_t slot,
    QueueHeader h) {

  h.crc =
      headerCrc(h);

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r+");

  if (!f) {
    return false;
  }

  if (!f.seek(
          headerOffset(slot))) {

    f.close();
    return false;
  }

  size_t n =
      f.write(
          reinterpret_cast<const uint8_t*>(&h),
          sizeof(h));

  if (n != sizeof(h)) {

    f.close();
    return false;
  }

  f.flush();

  f.close();

  return true;
}

bool persistQueueHeaderLocked() {

  QueueHeader h{};

  h.magic =
      QUEUE_MAGIC;

  h.version =
      QUEUE_VERSION;

  h.capacity =
      offlineCapacity;

  h.count =
      offlineCount;

  h.head =
      queueHeadIndex;

  h.generation =
      ++queueGeneration;

  h.crc =
      headerCrc(h);

  uint8_t slot =
      (uint8_t)(
          h.generation & 1U);

  if (!writeHeaderSlot(
          slot,
          h)) {

    queueGeneration--;

    return false;
  }

  return true;
}

bool validateQueueFileSize(
    uint16_t capacity) {

  if (!LittleFS.exists(
          QUEUE_PATH)) {

    return false;
  }

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r");

  if (!f) {
    return false;
  }

  size_t expected =
      recordsOffset() +
      (size_t)capacity *
      sizeof(OfflineTap);

  size_t actual =
      f.size();

  f.close();

  return actual == expected;
}

bool createFreshQueue(
    uint16_t capacity) {

  if (!storageReady) {
    return false;
  }

  if (capacity < OFFLINE_CAP_MIN) {
    capacity =
        OFFLINE_CAP_MIN;
  }

  if (capacity > OFFLINE_CAP_MAX) {
    capacity =
        OFFLINE_CAP_MAX;
  }

  LittleFS.remove(
      QUEUE_TMP);

  File f =
      LittleFS.open(
          QUEUE_TMP,
          "w");

  if (!f) {
    return false;
  }

  QueueHeader h0{};

  h0.magic =
      QUEUE_MAGIC;

  h0.version =
      QUEUE_VERSION;

  h0.capacity =
      capacity;

  h0.count = 0;
  h0.head = 0;

  h0.generation =
      1;

  h0.crc =
      headerCrc(h0);

  QueueHeader h1 =
      h0;

  h1.generation =
      0;

  h1.crc =
      headerCrc(h1);

  if (f.write(
          reinterpret_cast<const uint8_t*>(&h0),
          sizeof(h0)) !=
      sizeof(h0)) {

    f.close();

    LittleFS.remove(
        QUEUE_TMP);

    return false;
  }

  if (f.write(
          reinterpret_cast<const uint8_t*>(&h1),
          sizeof(h1)) !=
      sizeof(h1)) {

    f.close();

    LittleFS.remove(
        QUEUE_TMP);

    return false;
  }

  OfflineTap blank{};

  memset(
      &blank,
      0,
      sizeof(blank));

  for (uint16_t i = 0;
       i < capacity;
       ++i) {

    if (f.write(
            reinterpret_cast<const uint8_t*>(&blank),
            sizeof(blank)) !=
        sizeof(blank)) {

      f.close();

      LittleFS.remove(
          QUEUE_TMP);

      return false;
    }
  }

  f.flush();

  f.close();

  File verify =
      LittleFS.open(
          QUEUE_TMP,
          "r");

  if (!verify) {

    LittleFS.remove(
        QUEUE_TMP);

    return false;
  }

  size_t expected =
      recordsOffset() +
      (size_t)capacity *
      sizeof(OfflineTap);

  bool good =
      verify.size() ==
      expected;

  verify.close();

  if (!good) {

    LittleFS.remove(
        QUEUE_TMP);

    return false;
  }

  if (LittleFS.exists(
          QUEUE_PATH)) {

    LittleFS.remove(
        "/att_queue.old");

    LittleFS.rename(
        QUEUE_PATH,
        "/att_queue.old");
  }

  if (!LittleFS.rename(
          QUEUE_TMP,
          QUEUE_PATH)) {

    if (LittleFS.exists(
            "/att_queue.old")) {

      LittleFS.rename(
          "/att_queue.old",
          QUEUE_PATH);
    }

    return false;
  }

  LittleFS.remove(
      "/att_queue.old");

  offlineCapacity =
      capacity;

  offlineCount = 0;

  queueHeadIndex = 0;

  queueGeneration =
      1;

  saveOfflineCapacity(
      capacity);

  return true;
}

bool readQueueHeader() {

  if (!lockQueue()) {
    return false;
  }

  QueueHeader h{};

  bool ok =
      chooseNewestHeader(h);

  if (ok) {

    if (!validateQueueFileSize(
            h.capacity)) {

      ok = false;
    }
  }

  if (ok) {

    offlineCapacity =
        h.capacity;

    offlineCount =
        h.count;

    queueHeadIndex =
        h.head;

    queueGeneration =
        h.generation;
  }

  unlockQueue();

  return ok;
}

bool readQueueRecordLocked(
    uint16_t logicalIndex,
    OfflineTap& out) {

  if (!storageReady) {
    return false;
  }

  if (logicalIndex >= offlineCount) {
    return false;
  }

  uint16_t physical =
      (uint16_t)(
          (queueHeadIndex +
           logicalIndex)
          % offlineCapacity);

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r");

  if (!f) {
    return false;
  }

  if (!f.seek(
          recordOffset(
              physical))) {

    f.close();

    return false;
  }

  size_t n =
      f.read(
          reinterpret_cast<uint8_t*>(&out),
          sizeof(out));

  f.close();

  if (n != sizeof(out)) {
    return false;
  }

  out.uid[
      UID_TEXT_SIZE - 1] =
      '\0';

  out.eventId[
      EVENT_ID_SIZE - 1] =
      '\0';

  if (strlen(out.uid) == 0 ||
      strlen(out.eventId) == 0) {

    return false;
  }

  return true;
}

bool writeQueueRecordLocked(
    uint16_t physicalIndex,
    const OfflineTap& tap) {

  if (!storageReady ||
      physicalIndex >= offlineCapacity) {

    return false;
  }

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r+");

  if (!f) {
    return false;
  }

  if (!f.seek(
          recordOffset(
              physicalIndex))) {

    f.close();

    return false;
  }

  size_t n =
      f.write(
          reinterpret_cast<const uint8_t*>(&tap),
          sizeof(tap));

  if (n != sizeof(tap)) {

    f.close();

    return false;
  }

  f.flush();

  f.close();

  return true;
}

/** Tap record + new header in one open/flush — keeps the tap path short. */
bool appendRecordAndHeaderLocked(
    uint16_t physicalIndex,
    const OfflineTap& tap) {

  if (!storageReady ||
      physicalIndex >= offlineCapacity) {

    return false;
  }

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r+");

  if (!f) {
    return false;
  }

  bool ok =
      f.seek(recordOffset(physicalIndex)) &&
      f.write(
          reinterpret_cast<const uint8_t*>(&tap),
          sizeof(tap)) == sizeof(tap);

  QueueHeader h{};

  if (ok) {

    h.magic = QUEUE_MAGIC;
    h.version = QUEUE_VERSION;
    h.capacity = offlineCapacity;
    h.count = (uint16_t)(offlineCount + 1);
    h.head = queueHeadIndex;
    h.generation = queueGeneration + 1;
    h.crc = headerCrc(h);

    ok =
        f.seek(headerOffset((uint8_t)(h.generation & 1U))) &&
        f.write(
            reinterpret_cast<const uint8_t*>(&h),
            sizeof(h)) == sizeof(h);
  }

  f.flush();
  f.close();

  if (!ok) {
    return false;
  }

  offlineCount = h.count;
  queueGeneration = h.generation;

  return true;
}

/** Read the first `n` pending records with a single file open. */
uint8_t readQueueRecordsLocked(
    OfflineTap* out,
    uint8_t n) {

  if (!storageReady ||
      offlineCount == 0 ||
      n == 0) {

    return 0;
  }

  if (n > offlineCount) {
    n = (uint8_t)offlineCount;
  }

  File f =
      LittleFS.open(
          QUEUE_PATH,
          "r");

  if (!f) {
    return 0;
  }

  uint8_t got = 0;

  for (uint8_t i = 0; i < n; ++i) {

    uint16_t physical =
        (uint16_t)(
            (queueHeadIndex + i)
            % offlineCapacity);

    if (!f.seek(recordOffset(physical)) ||
        f.read(
            reinterpret_cast<uint8_t*>(&out[i]),
            sizeof(OfflineTap)) != sizeof(OfflineTap)) {

      break;
    }

    out[i].uid[UID_TEXT_SIZE - 1] = '\0';
    out[i].eventId[EVENT_ID_SIZE - 1] = '\0';

    if (strlen(out[i].uid) == 0 ||
        strlen(out[i].eventId) == 0) {

      break;
    }

    got++;
  }

  f.close();

  return got;
}

bool mountLittleFS() {

  // Prefer preserve existing attendance queue
  if (LittleFS.begin(false)) {
    return true;
  }

  Serial.println(
      "[STORAGE] LittleFS mount failed (empty or corrupt).");
  Serial.println(
      "[STORAGE] Formatting flash partition once...");

  // First boot / wrong partition / corruption — format required
  if (LittleFS.begin(true)) {
    littleFsFormattedOnce = true;
    Serial.println(
        "[STORAGE] Format OK — offline queue ready.");
    return true;
  }

  Serial.println(
      "[STORAGE] Format failed. Check board partition scheme includes LittleFS.");
  return false;
}

bool initOfflineQueue() {

  storageReady =
      mountLittleFS();

  if (!storageReady) {

    Serial.println(
        "ERROR: LittleFS unavailable — taps cannot be saved.");

    return false;
  }

  uint16_t savedCapacity =
      loadSavedOfflineCapacity();

  if (!readQueueHeader()) {

    Serial.println(
        "[STORAGE] Creating offline attendance queue...");

    if (!createFreshQueue(
            savedCapacity)) {

      Serial.println(
          "ERROR: Cannot create queue.");

      storageReady =
          false;

      return false;
    }

    if (!readQueueHeader()) {

      Serial.println(
          "ERROR: New queue failed verification.");

      storageReady =
          false;

      return false;
    }
  }

  eventSequence =
      loadEventSequence();

  Serial.print(
      "[STORAGE] Queue ready: ");

  Serial.print(
      offlineCount);

  Serial.print(
      "/");

  Serial.println(
      offlineCapacity);

  return true;
}

// ============================================================
// QUEUE ENQUEUE
// ============================================================

bool enqueueOffline(
    const String& uid,
    uint32_t epoch,
    String& eventIdOut) {

  if (!storageReady) {
    return false;
  }

  if (uid.length() == 0 ||
      uid.length() >= UID_TEXT_SIZE) {

    return false;
  }

  if (!lockQueue(1000)) {
    return false;
  }

  if (offlineCount >=
      offlineCapacity) {

    unlockQueue();

    Serial.println(
        "ERROR: Offline queue full. Tap NOT accepted.");

    return false;
  }

  uint32_t seq =
      nextEventSequence();

  String eventId =
      makeEventId(seq);

  OfflineTap tap{};

  memset(
      &tap,
      0,
      sizeof(tap));

  uid.toCharArray(
      tap.uid,
      sizeof(tap.uid));

  tap.epoch =
      epoch;

  tap.sequence =
      seq;

  eventId.toCharArray(
      tap.eventId,
      sizeof(tap.eventId));

  uint16_t physical =
      (uint16_t)(
          (queueHeadIndex +
           offlineCount)
          % offlineCapacity);

  if (!appendRecordAndHeaderLocked(
          physical,
          tap)) {

    unlockQueue();

    return false;
  }

  eventIdOut =
      eventId;

  unlockQueue();

  return true;
}

// ============================================================
// QUEUE FRONT / ACK
// ============================================================

bool acknowledgeFront(
    uint8_t n) {

  if (!storageReady ||
      n == 0) {

    return false;
  }

  if (!lockQueue(1000)) {
    return false;
  }

  if (n > offlineCount) {
    n = offlineCount;
  }

  if (n == 0) {

    unlockQueue();

    return true;
  }

  uint16_t oldHead =
      queueHeadIndex;

  uint16_t oldCount =
      offlineCount;

  queueHeadIndex =
      (uint16_t)(
          (queueHeadIndex + n)
          % offlineCapacity);

  offlineCount -= n;

  if (!persistQueueHeaderLocked()) {

    queueHeadIndex =
        oldHead;

    offlineCount =
        oldCount;

    unlockQueue();

    return false;
  }

  unlockQueue();

  return true;
}

// ============================================================
// TIME
// ============================================================

void initWallClockFromStorage() {

  uint32_t saved =
      loadLastKnownEpoch();

  if (saved <
      1700000000UL) {

    return;
  }

  timeAnchorEpoch =
      saved;

  timeAnchorMillis =
      millis();

  struct timeval tv{};

  tv.tv_sec =
      (time_t)saved;

  tv.tv_usec = 0;

  settimeofday(
      &tv,
      nullptr);

  Serial.print(
      "[TIME] Restored clock from last NTP sync (epoch ");

  Serial.print(
      saved);

  Serial.println(
      ") — allow Wi-Fi briefly to re-sync if power was off a long time.");
}

uint32_t currentEpoch() {

  time_t now =
      time(nullptr);

  if (now >= 1700000000) {

    ntpReady = true;

    uint32_t ep =
        (uint32_t)now;

    timeAnchorEpoch =
        ep;

    timeAnchorMillis =
        millis();

    if (lastEpochPersistMs == 0 ||
        elapsedMs(
            millis(),
            lastEpochPersistMs,
            60000UL)) {

      saveLastKnownEpoch(
          ep);

      lastEpochPersistMs =
          millis();
    }

    return ep;
  }

  if (timeAnchorEpoch >=
      1700000000UL) {

    uint32_t deltaSec =
        (millis() -
         timeAnchorMillis) /
        1000UL;

    return timeAnchorEpoch +
           deltaSec;
  }

  return 0;
}

String epochToIso(
    uint32_t epoch) {

  if (epoch <
      1700000000UL) {

    return "";
  }

  time_t t =
      (time_t)epoch;

  struct tm tmUtc{};

  if (!gmtime_r(
          &t,
          &tmUtc)) {

    return "";
  }

  char buf[25];

  if (strftime(
          buf,
          sizeof(buf),
          "%Y-%m-%dT%H:%M:%SZ",
          &tmUtc) == 0) {

    return "";
  }

  return String(buf);
}

void startNtp() {

  if (!isNetworkConnected()) {
    return;
  }

  configTime(
      0,
      0,
      "pool.ntp.org",
      "time.google.com",
      "time.cloudflare.com");

  ntpStarted = true;

  lastNtpAttempt =
      millis();

  Serial.println(
      "NTP started.");
}

void pollNtp() {

  if (!isNetworkConnected()) {

    ntpStarted = false;

    return;
  }

  if (currentEpoch() > 0) {
    return;
  }

  if (!ntpStarted) {

    startNtp();

    return;
  }

  if (elapsedMs(
          millis(),
          lastNtpAttempt,
          NTP_RETRY_INTERVAL_MS)) {

    startNtp();
  }
}

// ============================================================
// HTTP
// ============================================================

bool responseWithinLimit(
    HTTPClient& http,
    String& response) {

  int len =
      http.getSize();

  if (len >
      (int)HTTP_RESPONSE_LIMIT) {

    Serial.println(
        "HTTP response too large.");

    return false;
  }

  response =
      http.getString();

  if (response.length() >
      HTTP_RESPONSE_LIMIT) {

    Serial.println(
        "HTTP response exceeded safety limit.");

    response = "";

    return false;
  }

  return true;
}

uint32_t lastNetDiagAt = 0;
bool netDiagDone = false;

void diagnoseServerReachability(int httpCode) {

  Serial.print("[NET] HTTPS failed: ");
  Serial.print(httpCode);
  Serial.print(" (");
  Serial.print(HTTPClient::errorToString(httpCode));
  Serial.print(") · RSSI ");
  Serial.print(WiFi.RSSI());
  Serial.println(" dBm");

  if (netDiagDone &&
      !elapsedMs(millis(), lastNetDiagAt, NET_DIAG_INTERVAL_MS)) {
    return;
  }

  netDiagDone = true;
  lastNetDiagAt = millis();

  Serial.println("──────── NETWORK CHECK ────────");
  Serial.print("  Wi-Fi IP : ");
  Serial.print(WiFi.localIP());
  Serial.print("  gateway ");
  Serial.print(WiFi.gatewayIP());
  Serial.print("  DNS ");
  Serial.println(WiFi.dnsIP());

  IPAddress serverIp;

  if (!WiFi.hostByName(API_HOST, serverIp)) {
    Serial.print("  DNS      : FAILED to resolve ");
    Serial.println(API_HOST);
    Serial.println("  -> The school router/DNS cannot find the server.");
    Serial.println("     Fix: set router DNS to 8.8.8.8 / 1.1.1.1, or use another Wi-Fi/hotspot.");
    Serial.println("───────────────────────────────");
    return;
  }

  Serial.print("  DNS      : OK -> ");
  Serial.println(serverIp);

  WiFiClient tcp;
  uint32_t t0 = millis();

  if (!tcp.connect(serverIp, 443, 8000)) {
    Serial.println("  TCP 443  : BLOCKED / no internet");
    Serial.println("  -> Wi-Fi works but internet (HTTPS) is blocked.");
    Serial.println("     Fix: check the router has internet, no captive/login page,");
    Serial.println("     and the firewall allows attendance-api.shuleplus.rw:443.");
    Serial.println("───────────────────────────────");
    return;
  }

  Serial.print("  TCP 443  : OK (");
  Serial.print(millis() - t0);
  Serial.println(" ms)");
  tcp.stop();

  if (WiFi.RSSI() < -80) {
    Serial.println("  -> Signal is weak. Move the reader closer to the router.");
  } else {
    Serial.println("  -> Internet OK; HTTPS handshake is timing out or being intercepted.");
    Serial.println("     If the school has a web filter/proxy, whitelist attendance-api.shuleplus.rw.");
  }

  Serial.println("───────────────────────────────");
}

bool httpGetWithApiKey(
    const char* url,
    String& response,
    int& httpCode,
    uint32_t timeoutMs) {

  if (!isNetworkConnected()) {
    return false;
  }

  WiFiClientSecure client;

  /*
   * PRODUCTION REQUIREMENT:
   * Replace setInsecure() with the actual
   * ShulePlus root CA certificate.
   */

  client.setInsecure();

  HTTPClient http;

  http.setConnectTimeout(
      timeoutMs);

  http.setTimeout(
      timeoutMs);

  if (!http.begin(
          client,
          url)) {

    httpCode = -1;

    return false;
  }

  http.addHeader(
      "x-api-key",
      API_KEY);

  httpCode =
      http.GET();

  if (httpCode <= 0) {
    http.end();
    diagnoseServerReachability(httpCode);
    return false;
  }

  bool ok =
      httpCode > 0 &&
      responseWithinLimit(
          http,
          response);

  http.end();

  return ok;
}

bool httpPostJsonWithApiKey(
    const char* url,
    const String& body,
    String& response,
    int& httpCode,
    uint32_t timeoutMs) {

  if (!isNetworkConnected()) {
    return false;
  }

  WiFiClientSecure client;

  /*
   * PRODUCTION REQUIREMENT:
   * Replace setInsecure() with ShulePlus CA certificate.
   */

  client.setInsecure();

  HTTPClient http;

  http.setConnectTimeout(
      timeoutMs);

  http.setTimeout(
      timeoutMs);

  if (!http.begin(
          client,
          url)) {

    httpCode = -1;

    return false;
  }

  http.addHeader(
      "Content-Type",
      "application/json");

  http.addHeader(
      "x-api-key",
      API_KEY);

  httpCode =
      http.POST(body);

  if (httpCode <= 0) {
    http.end();
    diagnoseServerReachability(httpCode);
    return false;
  }

  bool ok =
      httpCode > 0 &&
      responseWithinLimit(
          http,
          response);

  http.end();

  return ok;
}

// ============================================================
// SIMPLE JSON HELPERS
// ============================================================

String extractJsonString(
    const String& json,
    const String& key) {

  String searchKey =
      "\"" + key + "\"";

  int keyPos =
      json.indexOf(
          searchKey);

  if (keyPos < 0) {
    return "";
  }

  int colonPos =
      json.indexOf(
          ':',
          keyPos +
          searchKey.length());

  if (colonPos < 0) {
    return "";
  }

  int firstQuote =
      json.indexOf(
          '"',
          colonPos + 1);

  if (firstQuote < 0) {
    return "";
  }

  String result;

  result.reserve(128);

  bool escaped = false;

  for (int i = firstQuote + 1;
       i < (int)json.length();
       ++i) {

    char c =
        json[i];

    if (escaped) {

      switch (c) {

        case '"':
          result += '"';
          break;

        case '\\':
          result += '\\';
          break;

        case '/':
          result += '/';
          break;

        case 'n':
          result += '\n';
          break;

        case 'r':
          result += '\r';
          break;

        case 't':
          result += '\t';
          break;

        default:
          result += c;
          break;
      }

      escaped = false;

      continue;
    }

    if (c == '\\') {

      escaped = true;

      continue;
    }

    if (c == '"') {
      return result;
    }

    result += c;

    if (result.length() >= 255) {
      return "";
    }
  }

  return "";
}

long extractJsonLong(
    const String& json,
    const String& key,
    long fallback = 0) {

  String searchKey =
      "\"" + key + "\"";

  int keyPos =
      json.indexOf(
          searchKey);

  if (keyPos < 0) {
    return fallback;
  }

  int colonPos =
      json.indexOf(
          ':',
          keyPos +
          searchKey.length());

  if (colonPos < 0) {
    return fallback;
  }

  int i =
      colonPos + 1;

  while (
      i < (int)json.length() &&
      (json[i] == ' ' ||
       json[i] == '\t' ||
       json[i] == '\r' ||
       json[i] == '\n')) {

    i++;
  }

  bool negative = false;

  if (i < (int)json.length() &&
      json[i] == '-') {

    negative = true;
    i++;
  }

  long value = 0;
  bool found = false;

  while (
      i < (int)json.length()) {

    char c =
        json[i];

    if (c < '0' ||
        c > '9') {

      break;
    }

    found = true;

    value =
        value * 10L +
        (c - '0');

    i++;
  }

  if (!found) {
    return fallback;
  }

  return negative
             ? -value
             : value;
}

// ============================================================
// REMOTE CONFIG
// ============================================================

bool applyOfflineCapacity(
    uint16_t newCap) {

  if (newCap <
      OFFLINE_CAP_MIN) {

    newCap =
        OFFLINE_CAP_MIN;
  }

  if (newCap >
      OFFLINE_CAP_MAX) {

    newCap =
        OFFLINE_CAP_MAX;
  }

  if (newCap ==
      offlineCapacity) {

    return true;
  }

  if (offlineCount >
      newCap) {

    Serial.println(
        "Remote capacity is smaller than pending queue.");

    Serial.println(
        "Resize refused to prevent attendance loss.");

    return false;
  }

  if (offlineCount != 0) {

    Serial.println(
        "Queue has pending taps; capacity change deferred.");

    saveOfflineCapacity(
        newCap);

    return false;
  }

  if (!lockQueue(1000)) {
    return false;
  }

  bool ok =
      createFreshQueue(
          newCap);

  unlockQueue();

  if (ok) {

    Serial.print(
        "Offline capacity changed to ");

    Serial.println(
        newCap);
  }

  return ok;
}

bool fetchAndApplyRemoteConfig(
    bool forceReconnect) {

  if (!isNetworkConnected()) {
    return false;
  }

  String response;

  int httpCode = 0;

  if (!httpGetWithApiKey(
          CONFIG_URL,
          response,
          httpCode,
          CONFIG_HTTP_TIMEOUT_MS)) {

    return false;
  }

  if (httpCode < 200 ||
      httpCode >= 300) {

    Serial.print(
        "Config HTTP ");

    Serial.println(
        httpCode);

    return false;
  }

  long people =
      extractJsonLong(
          response,
          "registeredPeople",
          -1);

  long cap =
      extractJsonLong(
          response,
          "offlineQueueCapacity",
          0);

  if (cap >= OFFLINE_CAP_MIN &&
      cap <= OFFLINE_CAP_MAX) {

    Serial.print(
        "Registered people=");

    Serial.print(
        people);

    Serial.print(
        " requested capacity=");

    Serial.println(
        cap);

    applyOfflineCapacity(
        (uint16_t)cap);
  }

  String remoteSsid =
      extractJsonString(
          response,
          "wifiSsid");

  String remotePassword =
      extractJsonString(
          response,
          "wifiPassword");

  if (remoteSsid.length() == 0) {
    return true;
  }

  String localSsid;
  String localPassword;

  loadWiFiCredentials(
      localSsid,
      localPassword);

  if (remoteSsid == localSsid &&
      remotePassword == localPassword) {

    return true;
  }

  Serial.println(
      "Applying remote Wi-Fi credentials.");

  saveWiFiCredentials(
      remoteSsid,
      remotePassword);

  if (forceReconnect) {

    WiFi.disconnect(false);

    delay(50);

    wifiConnected = false;
    wifiFailCount = 0;
    ntpReady = false;
    ntpStarted = false;
  }

  return true;
}

// ============================================================
// HEARTBEAT
// ============================================================

void sendHeartbeat() {

  if (!isNetworkConnected()) {
    return;
  }

  String body =
      "{\"ip\":\"" +
      WiFi.localIP().toString() +
      "\",\"rssi\":" +
      String(WiFi.RSSI()) +
      ",\"offlinePending\":" +
      String(offlineCount) +
      ",\"offlineCapacity\":" +
      String(offlineCapacity) +
      ",\"storageReady\":" +
      String(
          storageReady
              ? "true"
              : "false") +
      ",\"ntpReady\":" +
      String(
          ntpReady
              ? "true"
              : "false") +
      "}";

  String response;

  int httpCode = 0;

  bool ok =
      httpPostJsonWithApiKey(
          HEARTBEAT_URL,
          body,
          response,
          httpCode,
          CONFIG_HTTP_TIMEOUT_MS);

  if (!ok) {

    Serial.println(
        "Heartbeat transport failure.");

    return;
  }

  if (httpCode < 200 ||
      httpCode >= 300) {

    Serial.print(
        "Heartbeat HTTP ");

    Serial.println(
        httpCode);
  }
}

// ============================================================
// BATCH SYNC
// ============================================================

bool buildBatchBody(
    uint8_t requested,
    OfflineTap* batch,
    uint8_t& actual) {

  actual = 0;

  if (!storageReady ||
      offlineCount == 0) {

    return false;
  }

  if (!lockQueue(1000)) {
    return false;
  }

  uint8_t limit =
      requested;

  if (offlineCount <
      limit) {

    limit =
        offlineCount;
  }

  for (uint8_t i = 0;
       i < limit;
       ++i) {

    if (!readQueueRecordLocked(
            i,
            batch[i])) {

      unlockQueue();

      return false;
    }

    actual++;
  }

  unlockQueue();

  if (actual == 0) {
    return false;
  }

  String body;

  body.reserve(
      180 +
      actual * 140);

  body =
      "{\"events\":[";

  for (uint8_t i = 0;
       i < actual;
       ++i) {

    if (i) {
      body += ",";
    }

    body +=
        "{\"eventId\":\"";

    body +=
        batch[i].eventId;

    body +=
        "\",\"cardNumber\":\"";

    body +=
        batch[i].uid;

    String iso =
        epochToIso(
            batch[i].epoch);

    if (iso.length()) {

      body +=
          "\",\"scannedAt\":\"";

      body +=
          iso;
    }

    body +=
        "\",\"offline\":true}";
  }

  body +=
      "]}";

  return true;
}

String buildBatchJsonFromMemory(
    const OfflineTap* batch,
    uint8_t n) {

  String body;

  body.reserve(
      180 +
      n * 140);

  body =
      "{\"events\":[";

  for (uint8_t i = 0;
       i < n;
       ++i) {

    if (i) {
      body += ",";
    }

    body +=
        "{\"eventId\":\"";

    body +=
        batch[i].eventId;

    body +=
        "\",\"cardNumber\":\"";

    body +=
        batch[i].uid;

    String iso =
        epochToIso(
            batch[i].epoch);

    if (iso.length()) {

      body +=
          "\",\"scannedAt\":\"";

      body +=
          iso;
    }

    body +=
        "\",\"offline\":true}";
  }

  body +=
      "]}";

  return body;
}

String jsonStringInRange(
    const String& json,
    int from,
    int until,
    const char* key) {

  String searchKey =
      String("\"") + key + "\":\"";

  int p =
      json.indexOf(
          searchKey,
          from);

  if (p < 0 ||
      (until >= 0 && p > until)) {
    return "";
  }

  String out;

  for (int i = p + searchKey.length();
       i < (int)json.length();
       ++i) {

    char c = json[i];

    if (c == '\\' &&
        i + 1 < (int)json.length()) {
      out += json[++i];
      continue;
    }

    if (c == '"') {
      break;
    }

    out += c;
  }

  return out;
}

void printRejectedTaps(
    const String& response) {

  int pos = 0;
  uint8_t shown = 0;

  while (shown < 10) {

    int p =
        response.indexOf(
            "\"allowed\":false",
            pos);

    if (p < 0) {
      break;
    }

    int objStart =
        response.lastIndexOf(
            '{',
            p);

    int objEnd =
        response.indexOf(
            '}',
            p);

    String card =
        jsonStringInRange(
            response,
            objStart,
            p,
            "cardNumber");

    String reason =
        jsonStringInRange(
            response,
            p,
            objEnd,
            "reason");

    String message =
        jsonStringInRange(
            response,
            p,
            objEnd,
            "message");

    Serial.print("   x ");
    Serial.print(card.length() ? card : String("?"));
    Serial.print(" [");
    Serial.print(reason.length() ? reason : String("REJECTED"));
    Serial.print("] ");
    Serial.println(message);

    String lower = message;
    lower.toLowerCase();

    if (lower.indexOf("weekend") >= 0) {
      Serial.println(
          "     Fix: Attendance > Settings > turn ON \"Weekend attendance\".");
    } else if (lower.indexOf("holiday") >= 0) {
      Serial.println(
          "     Fix: Attendance > Settings > turn ON \"Holiday attendance\".");
    } else if (reason == "UNKNOWN_CARD") {
      Serial.println(
          "     Fix: assign this exact UID in Super Admin > Smart Access (same school as this gate).");
    } else if (reason == "WRONG_SCHOOL") {
      Serial.println(
          "     Fix: use the API key of a gate device registered under the card's school.");
    }

    pos = p + 1;
    shown++;
  }
}

void syncAttendanceQueue() {

  if (!isNetworkConnected()) {
    return;
  }

  if (!storageReady) {
    return;
  }

  if (offlineCount == 0) {
    return;
  }

  constexpr uint8_t BATCH = 10;

  OfflineTap batch[BATCH];

  uint8_t n = 0;

  if (!lockQueue(1000)) {
    return;
  }

  n = readQueueRecordsLocked(
      batch,
      BATCH);

  unlockQueue();

  if (n == 0) {

    Serial.println(
        "[SYNC] Could not read offline queue — will retry.");

    return;
  }

  String body =
      buildBatchJsonFromMemory(
          batch,
          n);

  Serial.println();
  Serial.println(
      "──────── SYNC ────────");
  Serial.print(
      "Uploading ");
  Serial.print(
      n);
  Serial.print(
      " of ");
  Serial.print(
      offlineCount);
  Serial.println(
      " offline tap(s)...");

  String response;

  int httpCode = 0;

  bool transportOk =
      httpPostJsonWithApiKey(
          GATE_BATCH_URL,
          body,
          response,
          httpCode,
          SYNC_HTTP_TIMEOUT_MS);

  if (!transportOk) {

    Serial.println(
        "[SYNC] No connection to server — keeping taps offline.");
    Serial.println(
        "─────────────────────");

    return;
  }

  if (httpCode < 200 ||
      httpCode >= 300) {

    Serial.print(
        "[SYNC] Server error HTTP ");
    Serial.print(
        httpCode);
    Serial.println(
        " — keeping taps offline.");

    if (response.length() > 0) {
      Serial.print(
          "  Detail: ");
      Serial.println(
          response.substring(0, 160));
    }

    Serial.println(
        "─────────────────────");

    return;
  }

  /*
   * Acknowledge processed events after HTTP 2xx.
   * Prefer ackedPrefix; also accept accepted+rejected / processed.
   */

  long ackedPrefix =
      extractJsonLong(
          response,
          "ackedPrefix",
          -1);

  long accepted =
      extractJsonLong(
          response,
          "accepted",
          -1);

  long rejected =
      extractJsonLong(
          response,
          "rejected",
          -1);

  long processed =
      extractJsonLong(
          response,
          "processed",
          -1);

  long entryCount =
      extractJsonLong(
          response,
          "entryCount",
          -1);

  long exitCount =
      extractJsonLong(
          response,
          "exitCount",
          -1);

  long duplicateCount =
      extractJsonLong(
          response,
          "duplicateCount",
          -1);

  if (processed < 0 &&
      accepted >= 0 &&
      rejected >= 0) {

    processed =
        accepted + rejected;
  }

  // If server omitted ackedPrefix but processed the whole batch, clear it
  if (ackedPrefix < 0) {

    if (processed == (long)n) {
      ackedPrefix = n;
    } else if (
        accepted == (long)n) {
      ackedPrefix = n;
    } else if (
        processed > 0) {
      ackedPrefix = processed;
    } else {
      // Last resort on plain 2xx with no counters: safe to clear this batch
      // only when response looks like success envelope
      if (response.indexOf(
              "\"success\":true") >=
              0 ||
          response.indexOf(
              "\"success\": true") >=
              0) {

        ackedPrefix = n;
      } else {
        ackedPrefix = 0;
      }
    }
  }

  // ackedPrefix == 0 with processed == n means all were handled (e.g. all skipped)
  if (ackedPrefix == 0 &&
      processed == (long)n &&
      n > 0) {

    ackedPrefix = n;
  }

  if (ackedPrefix > (long)n) {
    ackedPrefix = n;
  }

  String summary =
      extractJsonString(
          response,
          "summary");

  if (ackedPrefix > 0) {

    if (acknowledgeFront(
            (uint8_t)ackedPrefix)) {

      if (summary.length() > 0) {
        Serial.print(
            "[SYNC] ");
        Serial.println(
            summary);
      } else {
        Serial.print(
            "[SYNC] Cleared ");
        Serial.print(
            ackedPrefix);
        Serial.println(
            " tap(s) from device.");
      }

      if (accepted >= 0 ||
          entryCount >= 0 ||
          exitCount >= 0) {

        Serial.print(
            "  Saved: ");
        Serial.print(
            accepted >= 0
                ? accepted
                : 0);

        if (entryCount >= 0 ||
            exitCount >= 0) {

          Serial.print(
              "  (ENTRY ");
          Serial.print(
              entryCount >= 0
                  ? entryCount
                  : 0);
          Serial.print(
              " · EXIT ");
          Serial.print(
              exitCount >= 0
                  ? exitCount
                  : 0);
          Serial.print(
              ")");
        }

        if (duplicateCount > 0) {
          Serial.print(
              "  already-synced: ");
          Serial.print(
              duplicateCount);
        }

        Serial.println();
      }

      if (rejected > 0) {
        Serial.print(
            "  Skipped: ");
        Serial.print(
            rejected);
        Serial.println(
            " (server refused — reason below)");

        printRejectedTaps(
            response);
      }

      Serial.print(
          "  Still offline on device: ");
      Serial.println(
          offlineCount);

      if (offlineCount == 0) {
        Serial.println(
            "[SYNC] All clear — every tap is on the server.");
      } else {
        Serial.println(
            "[SYNC] More taps waiting — uploading next batch...");
      }

    } else {

      Serial.println(
          "[SYNC] Server OK but device could not clear queue — will retry.");
    }

  } else {

    Serial.println(
        "[SYNC] Server replied OK but did not confirm which taps to clear.");
    Serial.print(
        "  Response: ");
    Serial.println(
        response.substring(0, 200));
    Serial.println(
        "  Keeping taps offline and will retry.");
  }

  Serial.println(
      "─────────────────────");
}

// ============================================================
// WIFI STATE MACHINE
// ============================================================

enum WiFiState {
  WIFI_STATE_IDLE = 0,
  WIFI_STATE_CONNECTING,
  WIFI_STATE_CONNECTED
};

WiFiState wifiState =
    WIFI_STATE_IDLE;

unsigned long wifiAttemptStarted = 0;
unsigned long lastWifiRetry = 0;

bool noCredentialsLogged = false;

constexpr uint8_t VISIBLE_SSID_MAX = 12;
String visibleSsids[VISIBLE_SSID_MAX];
uint8_t visibleSsidCount = 0;

// Blocking (~2-3 s): call only from setup() or the network task, never loop().
void scanAndPrintNetworks(
    const String& wanted) {

  Serial.println(
      "[WIFI] Scanning nearby 2.4 GHz networks...");

  int n =
      WiFi.scanNetworks(
          false,
          true);

  if (n <= 0) {
    Serial.println(
        "  (no networks found — is the XIAO antenna plugged in?)");
    WiFi.scanDelete();
    return;
  }

  bool exact = false;
  String caseMismatch;

  if (stateMutex) {
    xSemaphoreTake(stateMutex, portMAX_DELAY);
  }

  visibleSsidCount = 0;

  for (int i = 0; i < n && i < 20; ++i) {

    String s = WiFi.SSID(i);

    Serial.printf(
        "  %2d) %-32s %4d dBm  ch%d\n",
        i + 1,
        s.length() ? s.c_str() : "(hidden)",
        (int)WiFi.RSSI(i),
        (int)WiFi.channel(i));

    if (wanted.length()) {
      if (s == wanted) {
        exact = true;
      } else if (s.equalsIgnoreCase(wanted)) {
        caseMismatch = s;
      }
    }

    bool duplicate = false;

    for (uint8_t j = 0; j < visibleSsidCount; ++j) {
      if (visibleSsids[j] == s) {
        duplicate = true;
        break;
      }
    }

    if (s.length() &&
        !duplicate &&
        visibleSsidCount < VISIBLE_SSID_MAX) {
      visibleSsids[visibleSsidCount++] = s;
    }
  }

  if (stateMutex) {
    xSemaphoreGive(stateMutex);
  }

  WiFi.scanDelete();

  if (!wanted.length()) {
    return;
  }

  if (exact) {
    Serial.print("  -> \"");
    Serial.print(wanted);
    Serial.println("\" IS visible: signal may be weak or the password is wrong.");
  } else if (caseMismatch.length()) {
    Serial.print("  -> Capital letters differ: saved \"");
    Serial.print(wanted);
    Serial.print("\" but router is \"");
    Serial.print(caseMismatch);
    Serial.println("\". Re-enter it on the setup page.");
  } else {
    Serial.print("  -> \"");
    Serial.print(wanted);
    Serial.println("\" is NOT in the list: router/hotspot is off, 5 GHz only, or too far.");
  }
}

void beginWiFiConnection() {

  String ssid;
  String password;

  if (!loadWiFiCredentials(
          ssid,
          password)) {

    if (!noCredentialsLogged) {
      Serial.println(
          "[WIFI] No saved network — use the setup hotspot to enter Wi-Fi.");
      noCredentialsLogged = true;
    }

    return;
  }

  // Keep the setup hotspot up; only restart the station side.
  // Stopping the pending attempt first avoids "sta is connecting, cannot set config".
  WiFi.persistent(false);
  WiFi.setAutoReconnect(false);

  if (WiFi.getMode() != WIFI_AP_STA) {
    WiFi.mode(WIFI_AP_STA);
  }

  WiFi.disconnect(false);
  delay(100);
  WiFi.setSleep(false);

  WiFi.begin(
      ssid.c_str(),
      password.c_str());

  wifiState =
      WIFI_STATE_CONNECTING;

  wifiAttemptStarted =
      millis();

  Serial.print(
      "[WIFI] Connecting to \"");
  Serial.print(
      ssid);
  Serial.println(
      "\"...");
}

void updateWiFiState() {

  wl_status_t status =
      WiFi.status();

  if (status == WL_CONNECTED) {

    if (wifiState !=
        WIFI_STATE_CONNECTED) {

      wifiState =
          WIFI_STATE_CONNECTED;

      wifiConnected =
          true;

      wifiFailCount =
          0;

      Serial.print(
          "[WIFI] Connected · IP=");

      Serial.println(
          WiFi.localIP());

      ntpReady = false;
      ntpStarted = false;

      startNtp();
    }

    return;
  }

  wifiConnected =
      false;

  if (wifiState ==
      WIFI_STATE_CONNECTING) {

    if (elapsedMs(
            millis(),
            wifiAttemptStarted,
            WIFI_CONNECT_TIMEOUT_MS)) {

      wl_status_t failStatus =
          WiFi.status();

      WiFi.disconnect(false);

      wifiState =
          WIFI_STATE_IDLE;

      if (wifiFailCount < 255) {
        wifiFailCount++;
      }

      Serial.print(
          "[WIFI] Timeout (attempt ");
      Serial.print(
          wifiFailCount);
      Serial.print(
          ") — ");

      if (failStatus == WL_NO_SSID_AVAIL) {
        Serial.println(
            "network NOT FOUND. Check the name (case-sensitive), use 2.4 GHz (not 5 GHz), attach the XIAO antenna, move closer.");

        if (wifiFailCount <= 2 ||
            wifiFailCount % 5 == 0) {

          String wantedSsid;
          String wantedPassword;

          loadWiFiCredentials(
              wantedSsid,
              wantedPassword);

          scanAndPrintNetworks(
              wantedSsid);
        }
      } else if (failStatus == WL_CONNECT_FAILED) {
        Serial.println(
            "router refused: wrong password?");
      } else {
        Serial.println(
            "no answer from router (wrong password, weak signal, or 5 GHz only).");
      }

      if (wifiFailCount ==
          WIFI_FAILS_BEFORE_SLOW) {

        Serial.print(
            "[WIFI] Still not connected. Check the Wi-Fi name/password on the setup hotspot \"SHULEPLUS-");
        Serial.print(
            DEVICE_ID);
        Serial.println(
            "\" -> http://192.168.4.1");
      }
    }

    return;
  }

  const uint32_t retryInterval =
      wifiFailCount >= WIFI_FAILS_BEFORE_SLOW
          ? WIFI_SLOW_RETRY_INTERVAL_MS
          : WIFI_RETRY_INTERVAL_MS;

  if (elapsedMs(
          millis(),
          lastWifiRetry,
          retryInterval)) {

    lastWifiRetry =
        millis();

    beginWiFiConnection();
  }
}

// ============================================================
// AP PROVISIONING
// ============================================================

String makeApPassword() {

  // Simple fixed password — schools find this on Serial / sticker docs
  return String(AP_PASSWORD_BASE);
}

const char AP_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShulePlus Wi-Fi Setup</title>
<style>
*{box-sizing:border-box}
body{
 margin:0;background:#151515;color:#fff;font-family:Arial,sans-serif;
 min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px
}
.card{
 width:100%;max-width:420px;background:#202020;border:1px solid #333;
 border-radius:16px;padding:28px;box-shadow:0 20px 50px rgba(0,0,0,.35)
}
.logo{font-size:28px;font-weight:700;color:#f5a623;margin-bottom:5px}
.device{color:#999;font-size:14px;margin-bottom:25px}
h2{margin:0 0 20px;font-size:21px}
label{display:block;font-size:13px;color:#aaa;margin-bottom:7px}
input{
 width:100%;padding:13px 14px;border-radius:9px;border:1px solid #444;
 background:#111;color:#fff;outline:none;margin-bottom:17px;font-size:15px
}
input:focus{border-color:#f5a623}
button{
 width:100%;padding:14px;border:none;border-radius:9px;background:#f5a623;
 color:#111;font-size:15px;font-weight:700;cursor:pointer
}
.info{margin-top:18px;font-size:13px;line-height:1.5;color:#999;text-align:center}
.status{background:#111;border:1px solid #333;border-radius:10px;padding:12px 14px;
 margin-bottom:22px;font-size:13px;line-height:1.7;color:#ccc}
.ok{color:#4cd964;font-weight:700}.bad{color:#ff5c5c;font-weight:700}
</style>
</head>
<body>
<div class="card">
<div class="logo">ShulePlus</div>
<div class="device">Device: %DEVICE_ID%</div>
<div class="status">%STATUS%</div>
<h2>Change Wi-Fi</h2>
<form action="/save" method="POST">
<label>Wi-Fi Network</label>
<input type="text" name="ssid" list="nets" maxlength="32" placeholder="Wi-Fi name (tap to pick)" required autocomplete="off">
<datalist id="nets">%NETS%</datalist>
<label>Wi-Fi Password</label>
<input type="password" name="password" maxlength="63" placeholder="Wi-Fi password">
<button type="submit">Save &amp; Connect</button>
</form>
<div class="info">
Wi-Fi credentials are stored on this device.
</div>
</div>
</body>
</html>
)rawliteral";

void handleAPRoot() {

  String page =
      AP_PAGE;

  page.replace(
      "%DEVICE_ID%",
      DEVICE_ID);

  String savedSsid;
  String savedPassword;
  bool hasSaved =
      loadWiFiCredentials(
          savedSsid,
          savedPassword);

  savedSsid.replace("&", "&amp;");
  savedSsid.replace("<", "&lt;");
  savedSsid.replace(">", "&gt;");

  String status =
      "Saved Wi-Fi: <b>" +
      (hasSaved ? savedSsid : String("none")) +
      "</b><br>";

  if (isNetworkConnected()) {
    status +=
        "Status: <span class='ok'>CONNECTED</span> · IP " +
        WiFi.localIP().toString() +
        " · " +
        String(WiFi.RSSI()) +
        " dBm<br>";
  } else {
    status +=
        "Status: <span class='bad'>NOT CONNECTED</span><br>";
  }

  status +=
      "Offline taps waiting: <b>" +
      String(offlineCount) +
      "</b>";

  String nets;

  if (!stateMutex ||
      xSemaphoreTake(stateMutex, pdMS_TO_TICKS(50)) == pdTRUE) {

    for (uint8_t i = 0; i < visibleSsidCount; ++i) {
      String s = visibleSsids[i];
      s.replace("&", "&amp;");
      s.replace("\"", "&quot;");
      s.replace("<", "&lt;");
      s.replace(">", "&gt;");
      nets += "<option value=\"" + s + "\">";
    }

    if (stateMutex) {
      xSemaphoreGive(stateMutex);
    }
  }

  page.replace(
      "%NETS%",
      nets);

  page.replace(
      "%STATUS%",
      status);

  server.send(
      200,
      "text/html; charset=utf-8",
      page);
}

void handleAPSave() {

  if (!server.hasArg(
          "ssid")) {

    server.send(
        400,
        "text/plain",
        "SSID is required.");

    return;
  }

  String ssid =
      server.arg(
          "ssid");

  String password =
      server.arg(
          "password");

  ssid.trim();

  if (ssid.length() == 0 ||
      ssid.length() > 32) {

    server.send(
        400,
        "text/plain",
        "Invalid SSID.");

    return;
  }

  if (password.length() > 63) {

    server.send(
        400,
        "text/plain",
        "Invalid Wi-Fi password.");

    return;
  }

  saveWiFiCredentials(
      ssid,
      password);

  server.send(
      200,
      "text/html",
      "<!DOCTYPE html><html><body style='background:#151515;color:#fff;"
      "font-family:Arial;display:flex;align-items:center;justify-content:center;"
      "min-height:100vh;text-align:center'>"
      "<div><h1 style='color:#f5a623'>Wi-Fi Saved</h1>"
      "<p>Restarting...</p></div></body></html>");

  delay(800);

  ESP.restart();
}

void startConfigPortal() {

  if (portalActive) {
    return;
  }

  String apName =
      "SHULEPLUS-" +
      String(DEVICE_ID);

  String apPassword =
      makeApPassword();

  // Hotspot stays up alongside the school Wi-Fi so it can be changed any time
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP_STA);
  delay(100);

  bool ok =
      WiFi.softAP(
          apName.c_str(),
          apPassword.c_str(),
          1,
          false,
          4);

  if (!ok) {

    Serial.println(
        "[AP] ERROR: hotspot failed to start.");

    startBuzzer(
        BUZZ_ERROR);

    return;
  }

  Serial.println();
  Serial.println(
      "╔══════════════════════════════════════╗");
  Serial.println(
      "║   SHULEPLUS — SET WI-FI ON PHONE     ║");
  Serial.println(
      "╠══════════════════════════════════════╣");
  Serial.print(
      "║  1) Join Wi-Fi: ");
  Serial.println(
      apName);
  Serial.print(
      "║  2) Password:   ");
  Serial.println(
      apPassword);
  Serial.println(
      "║  3) Open:       http://192.168.4.1   ║");
  Serial.println(
      "║  4) Enter school Wi-Fi name+password ║");
  Serial.println(
      "║  Hotspot stays ON — change Wi-Fi     ║");
  Serial.println(
      "║  any time, even when online.         ║");
  Serial.println(
      "╚══════════════════════════════════════╝");
  Serial.print(
      "[AP] Hotspot IP: ");
  Serial.println(
      WiFi.softAPIP());

  server.on(
      "/",
      HTTP_GET,
      handleAPRoot);

  server.on(
      "/save",
      HTTP_POST,
      handleAPSave);

  server.on(
      "/generate_204",
      HTTP_GET,
      handleAPRoot);

  server.on(
      "/hotspot-detect.html",
      HTTP_GET,
      handleAPRoot);

  server.on(
      "/connecttest.txt",
      HTTP_GET,
      handleAPRoot);

  server.onNotFound([]() {

    server.sendHeader(
        "Location",
        "/");

    server.send(
        302,
        "text/plain",
        "");
  });

  server.begin();

  portalActive = true;
}

// ============================================================
// RFID
// ============================================================

bool rfidReady = false;
bool spiStarted = false;
unsigned long lastRfidRetry = 0;
constexpr uint32_t RFID_RETRY_INTERVAL_MS = 5000UL;

bool initRFID(bool verbose) {

  if (!spiStarted) {
    SPI.begin(
        MFRC522_SCK,
        MFRC522_MISO,
        MFRC522_MOSI,
        MFRC522_SS);
    spiStarted = true;
  }

  byte fw = 0x00;

  // RC522 modules can need a moment after power-up before answering SPI
  for (uint8_t attempt = 0; attempt < 3; ++attempt) {

    rfid.PCD_Init();

    delay(50);

    fw =
        rfid.PCD_ReadRegister(
            MFRC522::VersionReg);

    if (fw != 0x00 &&
        fw != 0xFF) {
      break;
    }
  }

  if (fw == 0x00 ||
      fw == 0xFF) {

    rfidReady = false;

    if (verbose) {
      Serial.print(
          "ERROR: MFRC522 not detected (VersionReg=0x");
      Serial.print(fw, HEX);
      Serial.println(
          fw == 0x00
              ? " -> no answer: check 3.3V/GND/SDA(SS)/RST)."
              : " -> bus stuck high: check MISO/SCK wiring).");
      Serial.println("  Expected wiring (RC522 -> XIAO ESP32-C3):");
      Serial.println("    SDA/SS -> D6 (GPIO21)   SCK  -> D8 (GPIO8)");
      Serial.println("    MOSI   -> D10 (GPIO10)  MISO -> D9 (GPIO9)");
      Serial.println("    RST    -> D3 (GPIO5)    3.3V -> 3V3 (NOT 5V)  GND -> GND");
      Serial.println("  Will retry every 5s — fix wiring, no reboot needed.");
    }

    return false;
  }

  rfid.PCD_AntennaOn();

  rfidReady = true;

  Serial.print(
      "MFRC522 OK 0x");

  Serial.println(
      fw,
      HEX);

  return true;
}

String readCardUid() {

  String uid;

  uid.reserve(20);

  for (byte i = 0;
       i < rfid.uid.size;
       ++i) {

    if (rfid.uid.uidByte[i] <
        0x10) {

      uid += '0';
    }

    uid +=
        String(
            rfid.uid.uidByte[i],
            HEX);
  }

  uid.toUpperCase();

  if (uid.length() == 0 ||
      uid.length() >= UID_TEXT_SIZE) {

    return "";
  }

  return uid;
}

void releaseCard() {

  rfid.PICC_HaltA();

  rfid.PCD_StopCrypto1();
}

void handleCardTap(
    const String& cardUid) {

  if (!storageReady) {

    Serial.println(
        "Tap rejected: storage unavailable.");

    showLedResult(
        LED_RESULT_STORAGE_ERROR);

    startBuzzer(
        BUZZ_ERROR);

    return;
  }

  uint32_t epoch =
      currentEpoch();

  String eventId;

  // Feedback already played in loop() before this call.
  // Persist only — do not delay the beep behind LittleFS.
  if (epoch <
      1700000000UL) {

    Serial.println(
        "[TAP] WARNING: No valid clock — tap saved without scannedAt; "
        "server may record sync time. Connect Wi-Fi once for NTP.");
  }

  if (!enqueueOffline(
          cardUid,
          epoch,
          eventId)) {

    Serial.println(
        "Tap rejected: could not persist locally.");

    showLedResult(
        LED_RESULT_ERROR);

    startBuzzer(
        BUZZ_ERROR);

    return;
  }

  Serial.print(
      "CARD ");

  Serial.println(
      cardUid);

  Serial.print(
      "[TAP] Saved on device");

  if (!isNetworkConnected()) {
    Serial.print(
        " (offline — will sync when Wi-Fi is back)");
  }

  Serial.print(
      " · waiting=");

  Serial.println(
      offlineCount);
}

// ============================================================
// NETWORK TASK
// ============================================================

void networkTask(
    void* parameter) {

  networkTaskRunning =
      true;

  unsigned long lastHeartbeat = 0;
  unsigned long lastConfigSync = 0;
  unsigned long lastQueueSync = 0;

  bool firstConnectionHandled =
      false;

  for (;;) {

    updateWiFiState();

    if (isNetworkConnected()) {

      pollNtp();

      uint32_t now =
          millis();

      if (!firstConnectionHandled) {

        fetchAndApplyRemoteConfig(
            false);

        sendHeartbeat();

        lastHeartbeat =
            now;

        lastConfigSync =
            now;

        firstConnectionHandled =
            true;
      }

      if (elapsedMs(
              now,
              lastHeartbeat,
              HEARTBEAT_INTERVAL_MS)) {

        lastHeartbeat =
            now;

        sendHeartbeat();
      }

      if (elapsedMs(
              now,
              lastConfigSync,
              CONFIG_SYNC_INTERVAL_MS)) {

        lastConfigSync =
            now;

        fetchAndApplyRemoteConfig(
            false);
      }

      if (offlineCount > 0 &&
          elapsedMs(
              now,
              lastQueueSync,
              QUEUE_RETRY_INTERVAL_MS)) {

        lastQueueSync =
            now;

        syncAttendanceQueue();
      }

    } else {

      firstConnectionHandled =
          false;
    }

    if (!storageReady &&
        elapsedMs(
            millis(),
            lastStorageRetry,
            STORAGE_RETRY_INTERVAL_MS)) {

      lastStorageRetry =
          millis();

      Serial.println(
          "[STORAGE] Retrying LittleFS...");

      if (initOfflineQueue()) {
        Serial.println(
            "[STORAGE] Recovered.");
      }
    }

    vTaskDelay(
        pdMS_TO_TICKS(
            NETWORK_TASK_DELAY_MS));
  }
}

// ============================================================
// SETUP
// ============================================================

void setup() {

  Serial.begin(
      115200);

  delay(500);

  bootId =
      esp_random();

  Serial.println();

  Serial.println(
      "============================================");

  Serial.println(
      "SHULEPLUS GATE READER — PRODUCTION BUILD");

  Serial.println(
      "============================================");

  Serial.print(
      "Device: ");

  Serial.println(
      DEVICE_ID);

  Serial.print(
      "Boot ID: ");

  Serial.println(
      bootId);

  pinMode(
      BUZZER_PIN,
      OUTPUT);

  buzzerOff();

  setupRGB();

  queueMutex =
      xSemaphoreCreateMutex();

  stateMutex =
      xSemaphoreCreateMutex();

  if (!queueMutex ||
      !stateMutex) {

    Serial.println(
        "FATAL: Cannot create synchronization mutexes.");

    colorRed();

    while (true) {

      startBuzzer(
          BUZZ_ERROR);

      for (uint8_t i = 0;
           i < 100;
           ++i) {

        updateBuzzer();

        delay(10);
      }
    }
  }

  storageReady =
      initOfflineQueue();

  initWallClockFromStorage();

  if (!storageReady) {

    Serial.println(
        "WARNING: Storage unavailable.");

    showLedResult(
        LED_RESULT_STORAGE_ERROR);

    startBuzzer(
        BUZZ_ERROR);
  }

  lastRfidRetry = millis();

  if (!initRFID(true)) {

    Serial.println(
        "WARNING: RFID reader unavailable.");

    colorRed();
  }

  startConfigPortal();

  {
    String savedSsid;
    String savedPassword;

    loadWiFiCredentials(
        savedSsid,
        savedPassword);

    scanAndPrintNetworks(
        savedSsid);
  }

  beginWiFiConnection();

  lastWifiRetry =
      millis();

  BaseType_t result =
      xTaskCreate(
          networkTask,
          "ShuleNetwork",
          12288,
          nullptr,
          1,
          &networkTaskHandle);

  if (result != pdPASS) {

    Serial.println(
        "FATAL: Could not start network task.");

    colorRed();
  }

  startBuzzer(
      BUZZ_READY);

  Serial.println();

  Serial.println(
      "READY.");

  Serial.println(
      "RFID remains available while networking works.");

  Serial.println(
      "Green = locally persisted tap.");

  Serial.println(
      "Blue = Wi-Fi available.");

  Serial.println(
      "Red = Wi-Fi/storage/error condition.");
}

// ============================================================
// MAIN LOOP
// ============================================================

void loop() {

  updateBuzzer();

  updateStatusLed();

  if (portalActive) {
    server.handleClient();
  }

  /*
   * RFID remains the highest-priority operation
   * in the main loop (including during AP provisioning).
   *
   * HTTPS is handled by the network FreeRTOS task.
   */

  if (!rfidReady) {

    if (elapsedMs(
            millis(),
            lastRfidRetry,
            RFID_RETRY_INTERVAL_MS)) {

      lastRfidRetry = millis();

      if (initRFID(false)) {
        startBuzzer(BUZZ_READY);
      }
    }

    delay(1);
    return;
  }

  if (rfid.PICC_IsNewCardPresent() &&
      rfid.PICC_ReadCardSerial()) {

    String cardUid =
        readCardUid();

    if (cardUid.length() > 0) {

      unsigned long now =
          millis();

      bool sameCard =
          (cardUid == lastUid);

      if (!sameCard ||
          elapsedMs(
              now,
              lastCardRead,
              SAME_CARD_COOLDOWN_MS)) {

        lastUid =
            cardUid;

        lastCardRead =
            now;

        lastSeenCard =
            now;

        cardPresent =
            true;

        Serial.print(
            "CARD ");

        Serial.println(
            cardUid);

        // Instant beep + green BEFORE LittleFS save (no wait)
        showLedResult(
            LED_RESULT_QUEUED,
            LED_RESULT_QUEUED_HOLD_MS);

        startBuzzer(
            BUZZ_QUEUED);

        handleCardTap(
            cardUid);
      }
    }

    releaseCard();
  }

  /*
   * Tiny yield lets the ESP32 background task run.
   */

  delay(1);
}
