export const hashString = async str => {
  const buffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = new Uint8Array(hashBuffer);

  // Combine those 4 bytes into an unsigned 32-bit integer
  // The `>>> 0` ensures we get an unsigned result instead of a negative signed int.
  const value =
    ((hashArray[0] << 24) | (hashArray[1] << 16) | (hashArray[2] << 8) | hashArray[3]) >>> 0;

  const base64 = btoa(String(value));

  // Divide by 0xFFFFFFFF (the max 32-bit unsigned value) so the ratio is in [0..1]
  const normalised = value / 0xffffffff;

  return { base64, normalised };
};
