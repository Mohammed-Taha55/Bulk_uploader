/**
 * Array chunker utility.
 * Splits a large array into sub-arrays of a given size.
 * Used for batching Supabase upsert calls.
 *
 * @param {Array}  arr
 * @param {number} size  Max items per chunk (must be >= 1)
 * @returns {Array[]}
 *
 * @example
 * chunkArray([1,2,3,4,5], 2) // [[1,2],[3,4],[5]]
 */
function chunkArray(arr, size) {
  if (!Array.isArray(arr)) throw new TypeError('chunkArray: first argument must be an array');
  if (!Number.isInteger(size) || size < 1) throw new TypeError('chunkArray: size must be a positive integer');

  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

module.exports = { chunkArray };
