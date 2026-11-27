import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { utf8Decode, utf8Encode } from './utf8';

// Where the sign-in session is kept on the phone. The session is encrypted
// (AES-256-GCM) and the ciphertext goes in AsyncStorage; the key lives in the
// phone's keychain (iOS) or keystore (Android), which only this app can read.
// The keychain itself holds values of about 2 KB at most, and a session is
// bigger, hence the split.

export type Store = {
  getItem(name: string): Promise<string | null>;
  setItem(name: string, value: string): Promise<void>;
  removeItem(name: string): Promise<void>;
};
export type Keychain = {
  get(): Promise<string | null>;
  set(key: string): Promise<void>;
  remove(): Promise<void>;
};
export type Cipher = {
  newKey(): Promise<string>;
  encrypt(plain: Uint8Array, key: string): Promise<string>;
  decrypt(sealed: string, key: string): Promise<Uint8Array>;
};

export function createEncryptedStorage(store: Store, keychain: Keychain, cipher: Cipher) {
  let reading: Promise<string | null> | undefined;
  let creating: Promise<string> | undefined;
  const readKey = () => (reading ??= keychain.get());
  // one key at a time, even if two writes arrive together
  const ensureKey = () =>
    (creating ??= (async () => {
      const existing = await readKey();
      if (existing) return existing;
      const fresh = await cipher.newKey();
      await keychain.set(fresh);
      reading = Promise.resolve(fresh);
      return fresh;
    })());

  const setItem = async (name: string, value: string) => {
    const key = await ensureKey();
    await store.setItem(name, await cipher.encrypt(utf8Encode(value), key));
  };

  const getItem = async (name: string) => {
    const sealed = await store.getItem(name);
    if (sealed === null) return null;
    // saved in the clear by a build from before encryption: keep it, encrypted
    if (sealed.startsWith('{')) {
      await setItem(name, sealed);
      return sealed;
    }
    const key = await readKey();
    try {
      if (!key) throw new Error('No key');
      return utf8Decode(await cipher.decrypt(sealed, key));
    } catch {
      // the key is gone (a restored backup, a reinstall) or the data is damaged:
      // the person signs in again
      await store.removeItem(name);
      return null;
    }
  };

  return {
    getItem,
    setItem,
    removeItem: (name: string) => store.removeItem(name),
    /** Deletes the key, so anything encrypted with it can never be read again. */
    async forgetKey() {
      reading = undefined;
      creating = undefined;
      await keychain.remove();
    },
  };
}

const KEY_NAME = 'twig.session-key';
// readable once the phone has been unlocked after starting, never copied to another phone
const keychainOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

const aesCipher: Cipher = {
  async newKey() {
    return (await AESEncryptionKey.generate()).encoded('base64');
  },
  async encrypt(plain, key) {
    const sealed = await aesEncryptAsync(
      plain,
      (await AESEncryptionKey.import(key, 'base64')) as AESEncryptionKey,
    );
    return sealed.combined('base64');
  },
  async decrypt(sealed, key) {
    return aesDecryptAsync(
      AESSealedData.fromCombined(sealed),
      (await AESEncryptionKey.import(key, 'base64')) as AESEncryptionKey,
      { output: 'bytes' },
    );
  },
};

// The web build is for development only and has no keychain.
const native = Platform.OS !== 'web';
const encrypted = native
  ? createEncryptedStorage(
      AsyncStorage,
      {
        get: () => SecureStore.getItemAsync(KEY_NAME, keychainOptions),
        set: (key) => SecureStore.setItemAsync(KEY_NAME, key, keychainOptions),
        remove: () => SecureStore.deleteItemAsync(KEY_NAME, keychainOptions),
      },
      aesCipher,
    )
  : null;

/** The storage the Supabase client keeps its session in. */
export const sessionStorage: Store = encrypted ?? AsyncStorage;

/** Removes everything the app keeps on the phone, and the key. Used on sign-out. */
export async function clearLocalData(): Promise<void> {
  await AsyncStorage.clear();
  await encrypted?.forgetKey();
}
