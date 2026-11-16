import { useSyncExternalStore } from 'react';

/** The text in the top-bar search box. It is shared so that typing on any screen filters the Transactions list. */
let query = '';
const listeners = new Set<() => void>();
export const setSearch = (v: string): void => { query = v; listeners.forEach((f) => f()); };
export const useSearch = (): string => useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; }, () => query);
