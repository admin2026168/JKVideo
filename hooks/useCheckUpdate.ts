import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';

const GITHUB_API = 'https://api.github.com/repos/tiajinsha/JKVideo/releases/latest';

function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) > (pb[i] ?? 0)) return 1;
    if ((pa[i] ?? 0) < (pb[i] ?? 0)) return -1;
  }
  return 0;
}

export function useCheckUpdate() {
  const currentVersion = Constants.expoConfig?.version ?? '0.0.0';
  const [isChecking, setIsChecking] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  const checkUpdate = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(GITHUB_API, {
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const data = await res.json();

      const latestVersion: string = data.tag_name ?? '';
      const apkAsset = (data.assets as any[]).find((a) =>
        (a.name as string).endsWith('.apk')
      );
      const downloadUrl: string = apkAsset?.browser_download_url ?? '';
      const releaseNotes: string = data.body ?? '';

      if (compareVersions(latestVersion, currentVersion) <= 0) {
        Alert.alert('已是最新版本', `当前版本 v${currentVersion} 已是最新`);
        return;
      }

      Alert.alert(
        `发现新版本 ${latestVersion}`,
        releaseNotes || '有新版本可用，是否立即下载？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '下载安装',
            onPress: () => downloadAndInstall(downloadUrl, latestVersion),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('检查失败', e?.message ?? '网络错误，请稍后重试');
    } finally {
      setIsChecking(false);
    }
  };

  const downloadAndInstall = async (url: string, version: string) => {
    if (Platform.OS !== 'android') {
      Alert.alert('提示', '自动安装仅支持 Android 设备');
      return;
    }
    const localUri = FileSystem.cacheDirectory + `JKVideo-${version}.apk`;
    try {
      setDownloadProgress(0);
      const downloadResumable = FileSystem.createDownloadResumable(
        url,
        localUri,
        {},
        ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
          if (totalBytesExpectedToWrite > 0) {
            setDownloadProgress(
              Math.round((totalBytesWritten / totalBytesExpectedToWrite) * 100)
            );
          }
        }
      );
      await downloadResumable.downloadAsync();
      setDownloadProgress(null);

      const contentUri = await FileSystem.getContentUriAsync(localUri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: 'application/vnd.android.package-archive',
      });
    } catch (e: any) {
      setDownloadProgress(null);
      Alert.alert('下载失败', e?.message ?? '请稍后重试');
    }
  };

  return { currentVersion, isChecking, downloadProgress, checkUpdate };
}
