// Функция для выполнения запросов с ограничением параллелизма
export async function processWithConcurrency<T>(
  items: T[],
  processor: (item: T) => Promise<void>,
  concurrency: number = 3
): Promise<void> {
  const queue = [...items]
  const workers = Array(concurrency)
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (item) {
          await processor(item)
        }
      }
    })
  await Promise.all(workers)
}
