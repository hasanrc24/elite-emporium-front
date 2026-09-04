let challenge = null;

export const mfaChallenge = {
  get: () => challenge,
  set(value) { challenge = value; },
  clear() { challenge = null; },
};
