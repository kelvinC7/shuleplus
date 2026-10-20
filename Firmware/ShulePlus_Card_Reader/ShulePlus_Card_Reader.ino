/*
 * ShulePlus Card Reader (USB plug-and-play)
 * Hardware: XIAO ESP32-C3 + PN532 RFID + OLED
 *
 * Use in Super Admin → Smart Access to assign or edit student/staff RFID cards.
 * Connect via USB, click "Connect card reader" in Chrome/Edge — no Wi-Fi required.
 *
 * Serial protocol (115200 baud):
 *   CARD:<uid>     - card scanned (UID hex, uppercase)
 *   STEP:READY     - firmware ready
 *   STEP:SCANNING  - waiting for card
 *   STEP:DETECTED  - card read OK
 */

#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_PN532.h>

// ============================================================
// PINS - XIAO ESP32-C3 + PN532 + OLED
// ============================================================

// OLED
constexpr uint8_t OLED_SDA = 6;
constexpr uint8_t OLED_SCL = 7;
constexpr uint8_t OLED_I2C_ADDRESS = 0x3C;
constexpr uint32_t OLED_I2C_CLOCK = 100000;

// PN532 SPI
constexpr uint8_t PN532_SCK  = 8;
constexpr uint8_t PN532_MISO = 9;
constexpr uint8_t PN532_MOSI = 10;
constexpr uint8_t PN532_SS   = 21;

// Buzzer
constexpr uint8_t BUZZER_PIN = 2;

// ============================================================
// OLED
// ============================================================

Adafruit_SSD1306 oled(
  128,
  64,
  &Wire,
  -1
);

bool oledReady = false;

// ============================================================
// PN532
// ============================================================

Adafruit_PN532 rfid_reader(
  PN532_SS,
  &SPI
);

// ============================================================
// GLOBALS
// ============================================================

String lastUid = "";
unsigned long lastScanMs = 0;

constexpr uint32_t CARD_COOLDOWN_MS = 1500;
constexpr uint32_t HEARTBEAT_MS = 30000;

unsigned long lastHeartbeatMs = 0;

// ============================================================
// OLED FUNCTIONS
// ============================================================

void showOLED(const char* topLine, const char* bottomLine) {

  if (!oledReady) {
    return;
  }

  oled.clearDisplay();

  oled.setTextColor(SSD1306_WHITE);

  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println(topLine);

  oled.setTextSize(2);
  oled.setCursor(0, 24);
  oled.println(bottomLine);

  oled.display();
}

void showIdle() {
  showOLED("ShulePlus", "Ready");
}

void showScanning() {
  showOLED("ShulePlus", "Scan Card");
}

void showDetected(const String& uid) {

  if (!oledReady) {
    return;
  }

  oled.clearDisplay();

  oled.setTextColor(SSD1306_WHITE);

  oled.setTextSize(1);
  oled.setCursor(0, 0);
  oled.println("Card Detected");

  oled.setTextSize(2);
  oled.setCursor(0, 24);
  oled.println(uid);

  oled.display();
}

void showError() {
  showOLED("RFID", "Error");
}

// ============================================================
// BUZZER
// ============================================================

void buzzerOn() {
  digitalWrite(BUZZER_PIN, HIGH);
}

void buzzerOff() {
  digitalWrite(BUZZER_PIN, LOW);
}

void beepSuccess() {

  buzzerOn();
  delay(100);
  buzzerOff();

  delay(100);

  buzzerOn();
  delay(100);
  buzzerOff();
}

void beepError() {

  buzzerOn();
  delay(300);
  buzzerOff();
}

// ============================================================
// SERIAL PROTOCOL
// ============================================================

void emitStep(const char* step) {

  Serial.print("STEP:");
  Serial.println(step);
}

void emitCard(const String& uid) {

  Serial.print("CARD:");
  Serial.println(uid);
}

// ============================================================
// UID → HEX
// ============================================================

String uidToHex(uint8_t* uid, uint8_t uidLength) {

  String out = "";

  for (uint8_t i = 0; i < uidLength; i++) {

    if (uid[i] < 0x10) {
      out += "0";
    }

    out += String(uid[i], HEX);
  }

  out.toUpperCase();

  return out;
}

// ============================================================
// SETUP
// ============================================================

void setup() {

  // ----------------------------------------------------------
  // Buzzer
  // ----------------------------------------------------------

  pinMode(BUZZER_PIN, OUTPUT);
  buzzerOff();

  // ----------------------------------------------------------
  // Serial
  // ----------------------------------------------------------

  Serial.begin(115200);

  delay(400);

  // ----------------------------------------------------------
  // OLED
  // ----------------------------------------------------------

  Wire.begin(OLED_SDA, OLED_SCL);
  Wire.setClock(OLED_I2C_CLOCK);

  if (oled.begin(
        SSD1306_SWITCHCAPVCC,
        OLED_I2C_ADDRESS
      )) {

    oledReady = true;

    oled.clearDisplay();
    oled.setTextColor(SSD1306_WHITE);

    oled.setTextSize(1);
    oled.setCursor(0, 0);
    oled.println("ShulePlus");

    oled.setTextSize(2);
    oled.setCursor(0, 24);
    oled.println("Starting");

    oled.display();

  } else {

    oledReady = false;
  }

  // ----------------------------------------------------------
  // PN532 SPI
  // ----------------------------------------------------------

  SPI.begin(
    PN532_SCK,
    PN532_MISO,
    PN532_MOSI,
    PN532_SS
  );

  rfid_reader.begin();

  uint32_t firmwareVersion =
    rfid_reader.getFirmwareVersion();

  if (!firmwareVersion) {

    showError();

    emitStep("RFID_INIT_FAILED");

    beepError();

    while (true) {
      delay(1000);
    }
  }

  rfid_reader.SAMConfig();

  // ----------------------------------------------------------
  // READY
  // ----------------------------------------------------------

  showIdle();

  emitStep("READY");
  emitStep("SCANNING");
}

// ============================================================
// LOOP
// ============================================================

void loop() {

  const unsigned long now = millis();

  // ----------------------------------------------------------
  // Heartbeat
  // ----------------------------------------------------------

  if (now - lastHeartbeatMs >= HEARTBEAT_MS) {

    lastHeartbeatMs = now;

    emitStep("SCANNING");
  }

  // ----------------------------------------------------------
  // Read PN532 card
  // ----------------------------------------------------------

  uint8_t uid[7];
  uint8_t uidLength;

  bool cardFound =
    rfid_reader.readPassiveTargetID(
      PN532_MIFARE_ISO14443A,
      uid,
      &uidLength,
      100
    );

  if (!cardFound) {
    return;
  }

  // ----------------------------------------------------------
  // Convert UID
  // ----------------------------------------------------------

  String cardUid =
    uidToHex(uid, uidLength);

  // ----------------------------------------------------------
  // Validate UID
  // ----------------------------------------------------------

  if (cardUid.length() < 4) {

    showError();

    beepError();

    emitStep("INVALID_CARD");

    delay(300);

    showScanning();

    return;
  }

  // ----------------------------------------------------------
  // Prevent duplicate scans
  // ----------------------------------------------------------

  if (
    cardUid == lastUid &&
    (now - lastScanMs) < CARD_COOLDOWN_MS
  ) {
    return;
  }

  lastUid = cardUid;
  lastScanMs = now;

  // ----------------------------------------------------------
  // Card detected
  // ----------------------------------------------------------

  showDetected(cardUid);

  beepSuccess();

  emitStep("DETECTED");

  emitCard(cardUid);

  // ----------------------------------------------------------
  // Return to scanning
  // ----------------------------------------------------------

  delay(400);

  showScanning();

  emitStep("SCANNING");
}
