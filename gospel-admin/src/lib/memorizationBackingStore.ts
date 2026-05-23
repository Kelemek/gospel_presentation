/** @deprecated Import from `@/lib/gospelClientKvStore` instead. */
export {
  idbGetItem,
  idbRemoveItem,
  idbSetItem,
  isIndexedDbWritable,
} from '@/lib/gospelClientKvStore'

/** @deprecated IndexedDB is used on web and native for large keys via `gospelClientStorage`. */
export function useNativeMemorizationBackingStore(): boolean {
  return false
}
