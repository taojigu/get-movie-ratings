// Runs on movie-related pages (IMDb, Douban, Rotten Tomatoes)
// Detects movie title and notifies the background worker.

const title = document.title

chrome.runtime.sendMessage({ type: 'GET_RATINGS', title }, (response) => {
  if (chrome.runtime.lastError) return
  console.log('[Get Movie Ratings] response:', response)
})