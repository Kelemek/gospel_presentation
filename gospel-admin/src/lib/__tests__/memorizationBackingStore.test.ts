import {
  idbGetItem,
  idbRemoveItem,
  idbSetItem,
  isIndexedDbWritable,
  useNativeMemorizationBackingStore,
} from '@/lib/memorizationBackingStore'
import * as gospelClientKvStore from '@/lib/gospelClientKvStore'

describe('memorizationBackingStore (deprecated re-exports)', () => {
  it('re-exports gospelClientKvStore helpers', () => {
    expect(idbGetItem).toBe(gospelClientKvStore.idbGetItem)
    expect(idbSetItem).toBe(gospelClientKvStore.idbSetItem)
    expect(idbRemoveItem).toBe(gospelClientKvStore.idbRemoveItem)
    expect(isIndexedDbWritable).toBe(gospelClientKvStore.isIndexedDbWritable)
  })

  it('useNativeMemorizationBackingStore always returns false', () => {
    expect(useNativeMemorizationBackingStore()).toBe(false)
  })
})
