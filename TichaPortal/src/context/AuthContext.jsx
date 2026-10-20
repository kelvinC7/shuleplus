import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { isLiteSchoolTeacher } from '../utils/liteTeacherAccess';
import {
  iamLogin,
  iamLogout,
  restoreIamSession,
  mapIamUserToTeacher,
  canUseTeacherPortal,
  storeSession,
  clearSession,
  getAccessToken,
  captureTokenFromUrl,
} from '../services/iamAuth';
import { fetchPortalBootstrap } from '../services/teacherPortalApi';

const AuthContext = createContext();

const STAFF_LOGIN_PREFS_KEY = 'babyeyi_staff_login_prefs';

export const AuthProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
  const [portal, setPortal] = useState(null);
  const [loading, setLoading] = useState(true);

  const hydratePortal = async () => {
    try {
      const data = await fetchPortalBootstrap();
      setPortal(data);
      if (data?.teacher) {
        setTeacher((prev) => {
          if (!prev) return prev;
          const next = {
            ...prev,
            name: data.teacher.name || prev.name,
            full_name: data.teacher.name || prev.full_name,
            linked: data.teacher.linked,
            photo: data.teacher.photo || prev.photo,
          };
          storeSession({ teacher: next });
          return next;
        });
      }
      return data;
    } catch {
      setPortal(null);
      return null;
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        captureTokenFromUrl();
        const restored = await restoreIamSession();
        if (restored) {
          localStorage.setItem('teacher_logged_in', 'true');
          setTeacher(restored);
          await hydratePortal();
        } else {
          setTeacher(null);
          setPortal(null);
        }
      } catch (err) {
        console.error('[AuthContext] Session restore failed:', err.message);
        clearSession();
        setTeacher(null);
        setPortal(null);
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, []);

  /**
   * Sign in against ShulePlus IAM - same accounts created in
   * Timetable teacher settings and Authentication → Users & Access.
   */
  const login = async (identifier, password, { rememberMe = false } = {}) => {
    try {
      const result = await iamLogin(identifier, password, rememberMe);

      if (result?.requiresMfa) {
        return {
          success: false,
          message:
            result.deliveryMessage ||
            'This account requires verification. Complete sign-in from the main Shule+ login, then open Teacher Portal.',
        };
      }

      if (!result?.accessToken || !result.user) {
        return { success: false, message: 'Login failed. Please try again.' };
      }

      if (!canUseTeacherPortal(result.user)) {
        return {
          success: false,
          message:
            'This portal is for teachers. Use the main Shule+ login for your role, or ask an admin to assign Teacher Portal.',
        };
      }

      const mapped = mapIamUserToTeacher(result.user);
      storeSession({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        teacher: mapped,
      });

      if (rememberMe) {
        localStorage.setItem(
          STAFF_LOGIN_PREFS_KEY,
          JSON.stringify({
            remember: true,
            identifier: String(identifier || '').trim(),
          })
        );
      } else {
        localStorage.removeItem(STAFF_LOGIN_PREFS_KEY);
      }

      localStorage.setItem('teacher_logged_in', 'true');
      setTeacher(mapped);
      await hydratePortal();
      return { success: true, isLiteSchool: isLiteSchoolTeacher(mapped) };
    } catch (err) {
      const body = err.response?.data;
      const message = body?.message || 'Login failed. Please check your credentials.';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      await iamLogout(getAccessToken());
    } catch (e) {
      console.warn('[AuthContext] Logout error:', e.message);
    }
    clearSession();
    setTeacher(null);
    setPortal(null);
    window.location.href = '/login';
  };

  const refreshTeacher = async () => {
    const restored = await restoreIamSession();
    if (restored) {
      setTeacher(restored);
      await hydratePortal();
      return restored;
    }
    return null;
  };

  const updateTeacher = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    setTeacher((prev) => {
      const next = prev ? { ...prev, ...patch } : prev;
      if (next) storeSession({ teacher: next });
      return next;
    });
  };

  const isLiteSchool = useMemo(() => isLiteSchoolTeacher(teacher), [teacher]);

  return (
    <AuthContext.Provider value={{ teacher, portal, loading, login, logout, isLiteSchool, refreshTeacher, updateTeacher }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
