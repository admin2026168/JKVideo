import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { generateQRCode, pollQRCode, getUserInfo } from '../services/bilibili';
import { useAuthStore } from '../store/authStore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LoginModal({ visible, onClose }: Props) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrKey, setQrKey] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'waiting' | 'scanned' | 'done' | 'error'>('loading');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const login = useAuthStore(s => s.login);
  const setProfile = useAuthStore(s => s.setProfile);

  useEffect(() => {
    if (!visible) return;
    setStatus('loading');
    setQrUrl(null);
    setQrKey(null);
    generateQRCode().then(data => {
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data.url)}&size=200x200`);
      setQrKey(data.qrcode_key);
      setStatus('waiting');
    }).catch(() => setStatus('error'));

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [visible]);

  useEffect(() => {
    if (!qrKey || status !== 'waiting') return;
    pollRef.current = setInterval(async () => {
      const result = await pollQRCode(qrKey);
      if (result.code === 86038) { setStatus('error'); clearInterval(pollRef.current!); }
      if (result.code === 86090) setStatus('scanned');
      if (result.code === 0 && result.cookie) {
        clearInterval(pollRef.current!);
        await login(result.cookie, '', '');
        setStatus('done');
        // 登录后异步拉取用户头像和昵称
        getUserInfo().then(info => setProfile(info.face, info.uname, String(info.mid))).catch(() => {});
        onClose();
      }
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [qrKey, status]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>扫码登录</Text>
          {status === 'loading' && <ActivityIndicator size="large" color="#00AEEC" style={styles.loader} />}
          {(status === 'waiting' || status === 'scanned') && qrUrl && (
            <>
              <Image source={{ uri: qrUrl }} style={styles.qr} />
              <Text style={styles.hint}>{status === 'scanned' ? '扫描成功，请在手机确认' : '使用 B站 APP 扫一扫'}</Text>
            </>
          )}
          {status === 'error' && <Text style={styles.hint}>二维码已过期，请关闭重试</Text>}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeTxt}>关闭</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 20 },
  loader: { marginVertical: 40 },
  qr: { width: 200, height: 200, marginBottom: 12 },
  hint: { fontSize: 13, color: '#666', marginBottom: 20 },
  closeBtn: { padding: 12 },
  closeTxt: { fontSize: 14, color: '#00AEEC' },
});
