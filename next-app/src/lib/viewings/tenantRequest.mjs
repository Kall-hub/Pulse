export async function tenantRequest(token, input, { fetcher = fetch, timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetcher('/.netlify/functions/tenant-viewing', {
      method: input ? 'POST' : 'GET',
      signal: controller.signal,
      headers: { Authorization: 'Bearer ' + token, ...(input ? { 'Content-Type': 'application/json' } : {}) },
      ...(input ? { body: JSON.stringify(input) } : {})
    });
    let result;
    try { result = await response.json(); } catch { throw new Error('The booking service returned an unexpected response. Refresh the booking to check whether your response was saved.'); }
    if (!response.ok) throw new Error(result.error || 'Your response could not be saved. Refresh the booking and try again.');
    if (!result.viewing?.status) throw new Error('No booking confirmation was returned. Refresh the booking to check whether your response was saved.');
    return result.viewing;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The connection took too long. Your response may have been saved. Refresh the booking to check before trying again.');
    throw error;
  } finally { clearTimeout(timer); }
}
