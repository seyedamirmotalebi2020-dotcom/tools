// public/js/calculators.js
// Pure calculation functions for every calculator on tools.land.me.uk.
// No DOM, no side effects. Each returns a result object or null.

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(n, places = 6) {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function smartFormat(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs >= 1e9) return n.toExponential(4);
  if (abs >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (abs >= 1)    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function money(n, currency = '$') {
  return currency + Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ═══════════════════════════════════════════════════════════════════
// PERCENTAGE — six modes
// ═══════════════════════════════════════════════════════════════════
export const percentage = {
  // Mode 1: what is X% of Y?
  of(percent, number) {
    const p = toNum(percent), n = toNum(number);
    if (p == null || n == null) return null;
    const value = (p / 100) * n;
    return {
      value: round(value),
      display: smartFormat(round(value)),
      detail: `${smartFormat(p)}% of ${smartFormat(n)} = ${smartFormat(round(value))}`,
      formula: `(${smartFormat(p)} ÷ 100) × ${smartFormat(n)} = ${smartFormat(round(value))}`,
    };
  },

  // Mode 2: X is what % of Y?
  isWhat(number, total) {
    const x = toNum(number), y = toNum(total);
    if (x == null || y == null || y === 0) return null;
    const value = (x / y) * 100;
    return {
      value: round(value),
      display: smartFormat(round(value)) + '%',
      detail: `${smartFormat(x)} is ${smartFormat(round(value))}% of ${smartFormat(y)}`,
      formula: `(${smartFormat(x)} ÷ ${smartFormat(y)}) × 100 = ${smartFormat(round(value))}%`,
    };
  },

  // Mode 3: percentage change from old to new
  change(oldVal, newVal) {
    const o = toNum(oldVal), n = toNum(newVal);
    if (o == null || n == null || o === 0) return null;
    const value = ((n - o) / o) * 100;
    const sign = value > 0 ? '+' : '';
    const word = value > 0 ? 'increase' : value < 0 ? 'decrease' : 'no change';
    return {
      value: round(value),
      display: sign + smartFormat(round(value)) + '%',
      detail: `From ${smartFormat(o)} to ${smartFormat(n)} — ${word} of ${smartFormat(Math.abs(round(value)))}%`,
      formula: `((${smartFormat(n)} − ${smartFormat(o)}) ÷ ${smartFormat(o)}) × 100 = ${sign}${smartFormat(round(value))}%`,
      tone: value > 0 ? 'ok' : value < 0 ? 'warn' : undefined,
    };
  },

  // Mode 4: increase a value by %
  increaseBy(value, percent) {
    const v = toNum(value), p = toNum(percent);
    if (v == null || p == null) return null;
    const result = v * (1 + p / 100);
    const added = result - v;
    return {
      value: round(result),
      display: smartFormat(round(result)),
      detail: `${smartFormat(v)} increased by ${smartFormat(p)}% = ${smartFormat(round(result))} (added ${smartFormat(round(added))})`,
      formula: `${smartFormat(v)} × (1 + ${smartFormat(p)}/100) = ${smartFormat(round(result))}`,
    };
  },

  // Mode 5: decrease a value by %
  decreaseBy(value, percent) {
    const v = toNum(value), p = toNum(percent);
    if (v == null || p == null) return null;
    const result = v * (1 - p / 100);
    const removed = v - result;
    return {
      value: round(result),
      display: smartFormat(round(result)),
      detail: `${smartFormat(v)} decreased by ${smartFormat(p)}% = ${smartFormat(round(result))} (removed ${smartFormat(round(removed))})`,
      formula: `${smartFormat(v)} × (1 − ${smartFormat(p)}/100) = ${smartFormat(round(result))}`,
    };
  },

  // Mode 6: X is Y% of what number?
  findWhole(part, percent) {
    const p = toNum(part), pc = toNum(percent);
    if (p == null || pc == null || pc === 0) return null;
    const whole = (p / pc) * 100;
    return {
      value: round(whole),
      display: smartFormat(round(whole)),
      detail: `${smartFormat(p)} is ${smartFormat(pc)}% of ${smartFormat(round(whole))}`,
      formula: `(${smartFormat(p)} ÷ ${smartFormat(pc)}) × 100 = ${smartFormat(round(whole))}`,
    };
  },
};
// ═══════════════════════════════════════════════════════════════════
// PASSWORD GENERATOR
// ═══════════════════════════════════════════════════════════════════

// Curated word list for passphrases — short, memorable, common English words
// 256 words = 8 bits per word for entropy calculation
const PASSPHRASE_WORDS = `apple anchor arrow autumn basket beacon bird blossom
breeze bridge brook bubble butter cabin candle canvas canyon cedar cherry
circle cliff cloud clover coast copper coral crane cricket crystal dawn
delta desert dolphin dragon dream drift eagle earth ember falcon feather
fern field finch fire flame flower forest fox frost galaxy garden garnet
glacier globe grape grass grove harbor hawk hazel heart hedge honey horizon
island ivory ivy jade jasmine jungle juniper kestrel kite lagoon lake lantern
lark laurel leaf lemon lily linen lion lotus lunar maple marble meadow
mercury mesa mint mirror mist moon moss mountain nectar needle night north
oak ocean olive onyx opal orange orchid otter owl oyster paddle palace palm
panther paper parrot pebble pecan pelican pepper petal phoenix pine plum
polar pond poppy prairie prism quartz quill rabbit radish raven reef ribbon
river robin rose rowan ruby rustic saffron sage salmon sand sapphire scarlet
shadow shell shore silver sky snow sparrow spice spring spruce star stone
storm stream summit sunrise swallow swift tamarind teal thistle thunder tiger
timber topaz torch trail tulip turtle valley velvet vine violet walnut water
willow wind winter wisteria wolf yarrow zephyr amber azure cobalt crimson
dune emerald fable gale horizon indigo jasper lagoon mirage oasis prairie
quarry ripple summit tundra upland vista wetland zest`
  .split(/\s+/)
  .filter(Boolean);

function cryptoRandomInt(max) {
  if (max <= 0) return 0;
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xFFFFFFFF / max) * max;
  let val;
  do {
    crypto.getRandomValues(buf);
    val = buf[0];
  } while (val >= limit);
  return val % max;
}

function cryptoPick(str) {
  return str.charAt(cryptoRandomInt(str.length));
}

function cryptoShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const passwordGenerator = {
  CHARSETS: {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits:    '0123456789',
    symbols:   '!@#$%^&*()-_=+[]{}<>?',
  },
  SIMILAR_CHARS:    'il1IL|Lo0O',
  AMBIGUOUS_CHARS:  '{}[]()<>/\\\'"`~,;:._-',

  // Build the effective charset from options
  buildCharset(opts) {
    const CS = passwordGenerator.CHARSETS;
    let set = '';
    if (opts.lowercase) set += CS.lowercase;
    if (opts.uppercase) set += CS.uppercase;
    if (opts.digits)    set += CS.digits;
    if (opts.symbols)   set += CS.symbols;

    if (opts.excludeSimilar) {
      for (const c of passwordGenerator.SIMILAR_CHARS) {
        set = set.split(c).join('');
      }
    }
    if (opts.excludeAmbiguous) {
      for (const c of passwordGenerator.AMBIGUOUS_CHARS) {
        set = set.split(c).join('');
      }
    }
    return set;
  },

  // Generate a single random password
  generate(opts) {
    const charset = passwordGenerator.buildCharset(opts);
    if (charset.length === 0) return null;

    const length = Math.max(4, Math.min(128, Number(opts.length) || 16));
    const chars = [];

    // Guarantee at least one of each selected set (when possible)
    if (opts.guaranteeEach) {
      const sets = [];
      if (opts.lowercase) sets.push(passwordGenerator.CHARSETS.lowercase);
      if (opts.uppercase) sets.push(passwordGenerator.CHARSETS.uppercase);
      if (opts.digits)    sets.push(passwordGenerator.CHARSETS.digits);
      if (opts.symbols)   sets.push(passwordGenerator.CHARSETS.symbols);

      const filtered = sets
        .map((s) => {
          let f = s;
          if (opts.excludeSimilar) {
            for (const c of passwordGenerator.SIMILAR_CHARS) f = f.split(c).join('');
          }
          if (opts.excludeAmbiguous) {
            for (const c of passwordGenerator.AMBIGUOUS_CHARS) f = f.split(c).join('');
          }
          return f;
        })
        .filter(Boolean);

      for (const s of filtered) {
        if (chars.length < length) chars.push(cryptoPick(s));
      }
    }

    while (chars.length < length) chars.push(cryptoPick(charset));

    return cryptoShuffle(chars).join('');
  },

  // Generate multiple passwords at once
  generateBatch(opts, count = 5) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const p = passwordGenerator.generate(opts);
      if (p) out.push(p);
    }
    return out;
  },

  // Generate a passphrase
  generatePassphrase(opts) {
    const words = Math.max(3, Math.min(12, Number(opts.words) || 6));
    const sep = opts.separator ?? '-';
    const cap = !!opts.capitalize;
    const addNumber = !!opts.addNumber;

    const chosen = [];
    for (let i = 0; i < words; i++) {
      let w = PASSPHRASE_WORDS[cryptoRandomInt(PASSPHRASE_WORDS.length)];
      if (cap) w = w.charAt(0).toUpperCase() + w.slice(1);
      chosen.push(w);
    }

    let phrase = chosen.join(sep);

    if (addNumber) {
      const digit = cryptoRandomInt(10);
      // Append to a random word (not always the end)
      const idx = cryptoRandomInt(chosen.length);
      // Re-insert the number inside the phrase
      const parts = phrase.split(sep);
      parts[idx] = parts[idx] + digit;
      phrase = parts.join(sep);
    }

    return phrase;
  },

  // Entropy in bits
  entropy(bits) {
    return Math.round(bits * 10) / 10;
  },

  // Estimate crack time given bits of entropy
  // Assumes attacker can do 1e10 guesses per second
  crackTime(bits) {
    const guessesPerSecond = 1e10;
    // Average case: 2^(bits-1) guesses
    const seconds = Math.pow(2, bits - 1) / guessesPerSecond;
    return formatCrackTime(seconds);
  },

  // Strength category from bits
  strength(bits) {
    if (bits < 28)  return { label: 'Very weak',   tone: 'bad',  pct: 8   };
    if (bits < 36)  return { label: 'Weak',        tone: 'bad',  pct: 20  };
    if (bits < 60)  return { label: 'Fair',        tone: 'warn', pct: 45  };
    if (bits < 80)  return { label: 'Strong',      tone: 'ok',   pct: 72  };
    if (bits < 112) return { label: 'Very strong', tone: 'ok',   pct: 88  };
    return                { label: 'Excellent',   tone: 'ok',   pct: 100 };
  },

  // Full analysis of a password's entropy
  analyzePassword(opts) {
    const charset = passwordGenerator.buildCharset(opts);
    if (!charset.length) return { bits: 0, charsetSize: 0 };
    const bits = Math.log2(charset.length) * Math.max(1, Number(opts.length) || 16);
    return { bits, charsetSize: charset.length };
  },

  // Full analysis of a passphrase's entropy
  analyzePassphrase(opts) {
    const words = Math.max(3, Math.min(12, Number(opts.words) || 6));
    const bitsPerWord = Math.log2(PASSPHRASE_WORDS.length);
    const bits = bitsPerWord * words;
    return { bits, wordCount: words, wordListSize: PASSPHRASE_WORDS.length };
  },
    // ── Strength check for a user-supplied password ──
  check(text) {
    if (typeof text !== 'string' || text.length === 0) {
      return null;
    }

    const pw = text;
    const len = pw.length;

    // 1. Character classes present
    const hasLower   = /[a-z]/.test(pw);
    const hasUpper   = /[A-Z]/.test(pw);
    const hasDigits  = /[0-9]/.test(pw);
    const hasSymbols = /[^A-Za-z0-9]/.test(pw);
    const hasSpaces  = /\s/.test(pw);
    const hasNonAscii = /[^\x00-\x7F]/.test(pw);

    let charsetSize = 0;
    if (hasLower)   charsetSize += 26;
    if (hasUpper)   charsetSize += 26;
    if (hasDigits)  charsetSize += 10;
    if (hasSymbols) charsetSize += 33;   // typical ASCII symbol set
    if (hasSpaces)  charsetSize += 1;
    if (hasNonAscii) charsetSize += 100; // rough estimate for extended chars

    if (charsetSize === 0) charsetSize = 1;

    // 2. Base entropy
    let bits = Math.log2(charsetSize) * len;

    // 3. Penalties
    const warnings = [];
    const suggestions = [];

    // Very short
    if (len < 8) {
      bits *= 0.5;
      warnings.push({ key: 'short', text: `Only ${len} characters. Use at least 12.` });
      suggestions.push('Increase the length to 12 or more characters.');
    } else if (len < 12) {
      bits *= 0.8;
      warnings.push({ key: 'shortish', text: `${len} characters is on the short side.` });
      suggestions.push('Aim for 16 characters or more.');
    }

    // Only one character class
    const classCount = [hasLower, hasUpper, hasDigits, hasSymbols].filter(Boolean).length;
    if (classCount === 1) {
      bits *= 0.7;
      warnings.push({ key: 'oneclass', text: 'Only one type of character used.' });
      suggestions.push('Mix uppercase, lowercase, digits and symbols.');
    } else if (classCount === 2) {
      bits *= 0.9;
      suggestions.push('Consider adding a third character type.');
    }

    // Repeated characters (aaa, 1111)
    const repeats = pw.match(/(.)\1{2,}/g);
    if (repeats) {
      const maxRepeat = Math.max(...repeats.map((r) => r.length));
      bits -= (maxRepeat - 2) * 3;
      warnings.push({ key: 'repeat', text: `Repeated characters (e.g. "${repeats[0].slice(0, 5)}").` });
      suggestions.push('Avoid repeating the same character more than twice in a row.');
    }

    // Sequential characters (abc, 123, cba, 321)
    const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    for (const seq of sequences) {
      const rev = seq.split('').reverse().join('');
      for (let i = 0; i <= seq.length - 4; i++) {
        const run = seq.slice(i, i + 4);
        const runRev = rev.slice(i, i + 4);
        if (pw.toLowerCase().includes(run) || pw.toLowerCase().includes(runRev)) {
          bits -= 8;
          warnings.push({ key: 'seq', text: `Contains a sequence like "${run}".` });
          suggestions.push('Avoid runs like "abcd" or "1234" — they are guessed first.');
          break;
        }
      }
    }

    // Common password list (top 50 with a few UK-specific ones)
    const COMMON = [
      'password', '123456', '123456789', '12345678', '12345', 'qwerty',
      'abc123', 'monkey', 'dragon', 'letmein', 'login', 'admin', 'welcome',
      'master', 'sunshine', 'princess', 'football', 'baseball', 'iloveyou',
      'trustno1', 'superman', 'batman', 'shadow', 'michael', 'jennifer',
      'hello', 'charlie', 'donald', 'freedom', 'whatever', 'qazwsx', '1q2w3e4r',
      'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'passw0rd', 'p@ssw0rd',
      'password1', 'password123', 'letmein1', 'welcome1', 'admin123',
      'test', 'guest', 'root', 'user', 'demo', 'changeme', 'secret',
      'love', 'money', 'liverpool', 'arsenal', 'chelsea',
    ];
    const lower = pw.toLowerCase();
    const stripped = lower.replace(/[^a-z]/g, '');
    for (const c of COMMON) {
      if (lower === c || stripped === c || lower.startsWith(c) || lower.endsWith(c)) {
        bits = Math.min(bits, 20);
        warnings.push({ key: 'common', text: `"${c}" is one of the most-used passwords in the world.` });
        suggestions.push('Choose something completely different. Common passwords are tried first.');
        break;
      }
    }

    // Year / date patterns
    if (/\b(19|20)\d{2}\b/.test(pw)) {
      bits -= 6;
      warnings.push({ key: 'year', text: 'Contains a year, which attackers try early.' });
      suggestions.push('Avoid years, birthdays and anniversaries.');
    }

    // Only digits (e.g. a PIN)
    if (hasDigits && !hasLower && !hasUpper && !hasSymbols) {
      warnings.push({ key: 'pindigits', text: 'Only digits — this is essentially a PIN.' });
      suggestions.push('PINs are fine for bank cards, not for online accounts.');
    }

    // Leetspeak pattern (password -> p@ssw0rd)
    if (/p[@a]ssw[o0]rd/i.test(pw) || /adm[i1]n/i.test(pw)) {
      bits = Math.min(bits, 24);
      warnings.push({ key: 'leet', text: 'Recognisable word with letter substitutions.' });
      suggestions.push('Substituting letters ("a" → "@") does not add real security.');
    }

    // Positive suggestion
    if (!warnings.length && len >= 16) {
      suggestions.push('Good length and variety. Keep it unique — never reuse this password.');
    }
    if (!hasUpper && hasLower) suggestions.push('Add some uppercase letters.');
    if (!hasDigits && classCount >= 2) suggestions.push('Add a digit or two.');
    if (!hasSymbols && classCount >= 2) suggestions.push('Add a symbol like ! @ # or ?.');

    // Floor at zero
    bits = Math.max(0, bits);

    // Strength
    const s = passwordGenerator.strength(bits);

    return {
      length: len,
      hasLower, hasUpper, hasDigits, hasSymbols, hasSpaces, hasNonAscii,
      classCount,
      charsetSize,
      bits: Math.round(bits * 10) / 10,
      strength: s,
      crackTime: passwordGenerator.crackTime(bits),
      warnings,
      suggestions: [...new Set(suggestions)],
      isCommon: warnings.some((w) => w.key === 'common'),
    };
  },
};


function formatCrackTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  if (seconds < 1) return 'Instantly';
  if (seconds < 60) return Math.round(seconds) + ' seconds';
  if (seconds < 3600) return Math.round(seconds / 60) + ' minutes';
  if (seconds < 86400) return Math.round(seconds / 3600) + ' hours';
  if (seconds < 2592000) return Math.round(seconds / 86400) + ' days';
  if (seconds < 31536000) return Math.round(seconds / 2592000) + ' months';
  const years = seconds / 31536000;
  if (years < 1000) return Math.round(years) + ' years';
  if (years < 1e6) return Math.round(years / 1000) + ' thousand years';
  if (years < 1e9) return Math.round(years / 1e6) + ' million years';
  if (years < 1e12) return Math.round(years / 1e9) + ' billion years';
  if (years < 1e15) return Math.round(years / 1e12) + ' trillion years';
  return 'Longer than the age of the universe';
}

// ═══════════════════════════════════════════════════════════════════
// AGE
// ═══════════════════════════════════════════════════════════════════
export const age = {
  calculate(dobStr, refStr) {
    if (!dobStr) return null;
    const dob = new Date(dobStr + 'T00:00:00');
    const ref = refStr ? new Date(refStr + 'T00:00:00') : new Date();
    if (isNaN(dob) || isNaN(ref) || dob > ref) return null;

    let years  = ref.getFullYear() - dob.getFullYear();
    let months = ref.getMonth() - dob.getMonth();
    let days   = ref.getDate() - dob.getDate();

    if (days < 0) {
      months--;
      const prevMonthDays = new Date(ref.getFullYear(), ref.getMonth(), 0).getDate();
      days += prevMonthDays;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    const totalMs    = ref - dob;
    const totalDays  = Math.floor(totalMs / 86400000);
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = Math.floor(totalMs / 3600000);
    const totalMins  = Math.floor(totalMs / 60000);
    const totalSecs  = Math.floor(totalMs / 1000);

    // Remainder after whole weeks and days
    const remDaysAfterWeeks = totalDays % 7;

    // Total months (age in months, ignoring partial)
    const totalMonths = years * 12 + months;

    // Next birthday countdown
    const nextBday = new Date(ref.getFullYear(), dob.getMonth(), dob.getDate());
    if (nextBday < ref) nextBday.setFullYear(ref.getFullYear() + 1);
    const nextBdayDays = Math.ceil((nextBday - ref) / 86400000);
    const isBirthdayToday = (
      ref.getMonth() === dob.getMonth() &&
      ref.getDate() === dob.getDate()
    );

    // Day of week born
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const bornOn = dayNames[dob.getDay()];

    // Zodiac sign
    const zodiac = getZodiac(dob.getMonth() + 1, dob.getDate());

    // Format numbers for display
    const n = (v) => v.toLocaleString();

    return {
      // Primary display
      years, months, days,
      display: `${years}y ${months}m ${days}d`,

      // Detail string
      detail: `${n(totalDays)} days · next birthday in ${nextBdayDays} day${nextBdayDays === 1 ? '' : 's'}`,

      // Formula for the flagship card
      formula: `From ${formatDate(dob)} to ${formatDate(ref)} = ${years} years, ${months} months, ${days} days`,

      // Stats
      totalDays,
      totalWeeks,
      remDaysAfterWeeks,
      totalMonths,
      totalHours,
      totalMins,
      totalSecs,
      nextBdayDays,
      isBirthdayToday,
      bornOn,
      zodiac,

      // Formatted versions for display
      fmt: {
        totalDays:   n(totalDays),
        totalWeeks:  n(totalWeeks),
        totalMonths: n(totalMonths),
        totalHours:  n(totalHours),
        totalMins:   n(totalMins),
        totalSecs:   n(totalSecs),
        nextBdayDays: n(nextBdayDays),
      },
    };
  },
};

function formatDate(d) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getZodiac(month, day) {
  // month is 1-12, day is 1-31
  const signs = [
    { name: 'Capricorn',  end: [1, 19] },
    { name: 'Aquarius',   end: [2, 18] },
    { name: 'Pisces',     end: [3, 20] },
    { name: 'Aries',      end: [4, 19] },
    { name: 'Taurus',     end: [5, 20] },
    { name: 'Gemini',     end: [6, 20] },
    { name: 'Cancer',     end: [7, 22] },
    { name: 'Leo',        end: [8, 22] },
    { name: 'Virgo',      end: [9, 22] },
    { name: 'Libra',      end: [10, 22] },
    { name: 'Scorpio',    end: [11, 21] },
    { name: 'Sagittarius',end: [12, 21] },
    { name: 'Capricorn',  end: [12, 31] },
  ];
  for (const s of signs) {
    const [m, d] = s.end;
    if (month < m || (month === m && day <= d)) return s.name;
  }
  return 'Capricorn';
}

// ═══════════════════════════════════════════════════════════════════
// DATE DIFFERENCE
// ═══════════════════════════════════════════════════════════════════
export const dateDiff = {
  calculate(fromStr, toStr) {
    if (!fromStr || !toStr) return null;
    const from = new Date(fromStr + 'T00:00:00');
    const to   = new Date(toStr   + 'T00:00:00');
    if (isNaN(from) || isNaN(to)) return null;

    // Always work from earlier to later internally
    const [a, b] = from <= to ? [from, to] : [to, from];
    const reversed = from > to;

    const ms   = b - a;
    const days = Math.round(ms / 86400000);

    // Weeks + remaining days
    const weeks     = Math.floor(days / 7);
    const remDays   = days % 7;

    // Years, months, days (calendar-aware, like age)
    let years  = b.getFullYear() - a.getFullYear();
    let months = b.getMonth() - a.getMonth();
    let dayPart = b.getDate() - a.getDate();

    if (dayPart < 0) {
      months--;
      const prevMonthDays = new Date(b.getFullYear(), b.getMonth(), 0).getDate();
      dayPart += prevMonthDays;
    }
    if (months < 0) {
      years--;
      months += 12;
    }

    // Total months (calendar-aware)
    const totalMonths = years * 12 + months;

    // Business days (Mon–Fri) and weekend days
    let businessDays = 0;
    let weekendDays  = 0;
    const cur = new Date(a);
    while (cur < b) {
      const d = cur.getDay();
      if (d === 0 || d === 6) weekendDays++;
      else businessDays++;
      cur.setDate(cur.getDate() + 1);
    }

    // Fine units
    const totalHours = days * 24;
    const totalMins  = totalHours * 60;
    const totalSecs  = totalMins * 60;

    // Inclusive count (both endpoints) — one more than exclusive
    const inclusiveDays = days + 1;

    // Format numbers
    const n = (v) => v.toLocaleString();

    // Build a compact human display
    const parts = [];
    if (years)  parts.push(`${years} year${years === 1 ? '' : 's'}`);
    if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);
    if (dayPart) parts.push(`${dayPart} day${dayPart === 1 ? '' : 's'}`);
    const human = parts.length ? parts.join(', ') : '0 days';

    return {
      // Primary display — total days
      display: n(days) + (days === 1 ? ' day' : ' days'),

      // Secondary detail
      detail: `${human} · ${n(businessDays)} business day${businessDays === 1 ? '' : 's'}`,

      // Formula for the flagship card
      formula: `${formatDate(a)} → ${formatDate(b)} = ${n(days)} day${days === 1 ? '' : 's'}`,

      // Reverse flag (user entered dates in the wrong order)
      reversed,

      // Calendar-aware breakdown
      years, months, days: dayPart,
      human,

      // Unit breakdowns
      weeks, remDays,
      totalMonths,
      totalDays: days,
      inclusiveDays,
      businessDays,
      weekendDays,
      totalHours,
      totalMins,
      totalSecs,

      // Formatted strings for the stats grid
      fmt: {
        years:         n(years),
        months:        n(months),
        dayPart:       n(dayPart),
        totalMonths:   n(totalMonths),
        weeks:         n(weeks),
        remDays:       n(remDays),
        days:          n(days),
        inclusiveDays: n(inclusiveDays),
        businessDays:  n(businessDays),
        weekendDays:   n(weekendDays),
        totalHours:    n(totalHours),
        totalMins:     n(totalMins),
        totalSecs:     n(totalSecs),
      },
    };
  },
};



// ═══════════════════════════════════════════════════════════════════
// TIP
// ═══════════════════════════════════════════════════════════════════
export const tip = {
  calculate(bill, percent, split, roundUp) {
    const b = toNum(bill);
    const p = toNum(percent);
    const s = toNum(split) || 1;
    if (b == null || p == null || s <= 0 || b < 0) return null;

    const baseTip   = b * p / 100;
    const baseTotal = b + baseTip;

    // Optional: round total up to the nearest whole currency unit
    let finalTotal = baseTotal;
    let roundingAdd = 0;
    if (roundUp && baseTotal > 0) {
      finalTotal = Math.ceil(baseTotal);
      roundingAdd = finalTotal - baseTotal;
    }

    const finalTip     = finalTotal - b;
    const perPerson    = finalTotal / s;
    const tipPerPerson = finalTip / s;
    const effectivePct = b > 0 ? (finalTip / b) * 100 : 0;

    return {
      tipAmount: round(finalTip, 2),
      total: round(finalTotal, 2),
      perPerson: round(perPerson, 2),
      tipPerPerson: round(tipPerPerson, 2),
      baseTip: round(baseTip, 2),
      baseTotal: round(baseTotal, 2),
      roundingAdd: round(roundingAdd, 2),
      effectivePercent: round(effectivePct, 2),
      split: s,

      display: money(round(finalTotal, 2)),
      detail: `Tip ${money(round(finalTip, 2))} · ${
        s === 1
          ? 'Full bill'
          : money(round(perPerson, 2)) + ' each'
      }`,
      formula: `${money(b)} + ${smartFormat(p)}% tip${
        roundUp && roundingAdd > 0 ? ' (rounded up)' : ''
      } = ${money(round(finalTotal, 2))}`,

      fmt: {
        tip:            money(round(finalTip, 2)),
        total:          money(round(finalTotal, 2)),
        perPerson:      money(round(perPerson, 2)),
        tipPerPerson:   money(round(tipPerPerson, 2)),
        baseTip:        money(round(baseTip, 2)),
        baseTotal:      money(round(baseTotal, 2)),
        roundingAdd:    money(round(roundingAdd, 2)),
        effectivePercent: round(effectivePct, 2).toFixed(2) + '%',
        splitCount:     s.toLocaleString(),
      },
    };
  },
};
// ═══════════════════════════════════════════════════════════════════
// DISCOUNT
// ═══════════════════════════════════════════════════════════════════
export const discount = {
  // Mode 1: from an original price and a discount %, find the sale price
  fromPrice(price, percent) {
    const p = toNum(price);
    const d = toNum(percent);
    if (p == null || d == null || p < 0) return null;

    const savings   = p * d / 100;
    const salePrice = p - savings;
    const effective = p > 0 ? (savings / p) * 100 : 0;

    return {
      mode: 'fromPrice',
      salePrice:  round(salePrice, 2),
      savings:    round(savings, 2),
      original:   round(p, 2),
      percent:    round(d, 2),
      effective:  round(effective, 2),

      display: money(round(salePrice, 2)),
      detail: `You save ${money(round(savings, 2))} (${smartFormat(round(d, 2))}% off)`,
      formula: `${money(round(p, 2))} − ${smartFormat(round(d, 2))}% = ${money(round(salePrice, 2))}`,

      fmt: {
        salePrice: money(round(salePrice, 2)),
        savings:   money(round(savings, 2)),
        original:  money(round(p, 2)),
        percent:   round(d, 2).toFixed(2) + '%',
        effective: round(effective, 2).toFixed(2) + '%',
      },
    };
  },

  // Mode 2: from a sale price and a discount %, find the original price
  findOriginal(salePrice, percent) {
    const s = toNum(salePrice);
    const d = toNum(percent);
    if (s == null || d == null || s < 0) return null;
    if (d < 0 || d >= 100) return null; // 100% off = original is infinite

    const original = s / (1 - d / 100);
    const savings  = original - s;

    return {
      mode: 'findOriginal',
      original:  round(original, 2),
      salePrice: round(s, 2),
      savings:   round(savings, 2),
      percent:   round(d, 2),

      display: money(round(original, 2)),
      detail: `Original price was ${money(round(original, 2))} · you saved ${money(round(savings, 2))}`,
      formula: `${money(round(s, 2))} ÷ (1 − ${smartFormat(round(d, 2))}/100) = ${money(round(original, 2))}`,

      fmt: {
        original:  money(round(original, 2)),
        salePrice: money(round(s, 2)),
        savings:   money(round(savings, 2)),
        percent:   round(d, 2).toFixed(2) + '%',
      },
    };
  },

  // Backwards-compatible alias so older code doesn't break
  calculate(price, percent) {
    return discount.fromPrice(price, percent);
  },
};

// ═══════════════════════════════════════════════════════════════════
// UNIT CONVERTER
// ═══════════════════════════════════════════════════════════════════

const UNIT_DEFS = {
  length: {
    label: 'Length',
    icon: 'fa-ruler-combined',
    base: 'm',
    units: {
      mm: { name: 'Millimeter', short: 'mm', factor: 0.001,        us: false },
      cm: { name: 'Centimeter', short: 'cm', factor: 0.01,         us: false },
      m:  { name: 'Meter',      short: 'm',  factor: 1,            us: false },
      km: { name: 'Kilometer',  short: 'km', factor: 1000,         us: false },
      in: { name: 'Inch',       short: 'in', factor: 0.0254,       us: true  },
      ft: { name: 'Foot',       short: 'ft', factor: 0.3048,       us: true  },
      yd: { name: 'Yard',       short: 'yd', factor: 0.9144,       us: true  },
      mi: { name: 'Mile',       short: 'mi', factor: 1609.344,     us: true  },
    },
  },
  weight: {
    label: 'Weight',
    icon: 'fa-weight-hanging',
    base: 'kg',
    units: {
      mg: { name: 'Milligram', short: 'mg', factor: 1e-6,       us: false },
      g:  { name: 'Gram',      short: 'g',  factor: 0.001,      us: false },
      kg: { name: 'Kilogram',  short: 'kg', factor: 1,          us: false },
      t:  { name: 'Tonne',     short: 't',  factor: 1000,       us: false },
      oz: { name: 'Ounce',     short: 'oz', factor: 0.028349523, us: true  },
      lb: { name: 'Pound',     short: 'lb', factor: 0.45359237, us: true  },
      st: { name: 'Stone',     short: 'st', factor: 6.35029318, us: true  },
    },
  },
  temperature: {
    label: 'Temperature',
    icon: 'fa-temperature-half',
    base: 'c',
    units: {
      c: { name: 'Celsius',    short: '°C', factor: null, us: false },
      f: { name: 'Fahrenheit', short: '°F', factor: null, us: true  },
      k: { name: 'Kelvin',     short: 'K',  factor: null, us: false },
    },
  },
  volume: {
    label: 'Volume',
    icon: 'fa-flask',
    base: 'l',
    units: {
      ml:     { name: 'Milliliter',       short: 'ml',    factor: 0.001,      us: false },
      l:      { name: 'Liter',            short: 'L',     factor: 1,          us: false },
      cup:    { name: 'Cup (US)',         short: 'cup',   factor: 0.2365882,  us: true  },
      pint:   { name: 'Pint (US)',        short: 'pt',    factor: 0.4731765,  us: true  },
      quart:  { name: 'Quart (US)',       short: 'qt',    factor: 0.9463529,  us: true  },
      gallon: { name: 'Gallon (US)',      short: 'gal',   factor: 3.7854118,  us: true  },
      floz:   { name: 'Fluid ounce (US)', short: 'fl oz', factor: 0.0295735,  us: true  },
    },
  },
  speed: {
    label: 'Speed',
    icon: 'fa-gauge-high',
    base: 'mps',
    units: {
      mps:  { name: 'Metres per second',   short: 'm/s',  factor: 1,          us: false },
      kph:  { name: 'Kilometres per hour', short: 'km/h', factor: 0.2777778,  us: false },
      mph:  { name: 'Miles per hour',      short: 'mph',  factor: 0.44704,    us: true  },
      knot: { name: 'Knot',                short: 'kn',   factor: 0.5144444,  us: false },
    },
  },
};

export const unitConverter = {
  categories: UNIT_DEFS,

  convert(category, from, to, value) {
    const v = toNum(value);
    if (v == null) return null;

    const def = UNIT_DEFS[category];
    if (!def) return null;
    const fromDef = def.units[from];
    const toDef   = def.units[to];
    if (!fromDef || !toDef) return null;

    let out;
    if (category === 'temperature') {
      const c = toCelsius(v, from);
      if (c == null) return null;
      out = fromCelsius(c, to);
    } else {
      const baseValue = v * fromDef.factor;
      out = baseValue / toDef.factor;
    }

    if (!Number.isFinite(out)) return null;

    const rounded = round(out, 6);
    return {
      value: rounded,
      display: smartFormat(rounded),
      detail: `${smartFormat(v)} ${fromDef.short} = ${smartFormat(rounded)} ${toDef.short}`,
      formula: `${smartFormat(v)} ${fromDef.short} → ${smartFormat(rounded)} ${toDef.short}`,
      fmt: {
        value: smartFormat(v),
        result: smartFormat(rounded),
        fromShort: fromDef.short,
        toShort: toDef.short,
        fromName: fromDef.name,
        toName: toDef.name,
      },
    };
  },

  // Convert a value into every unit in the category at once.
  convertAll(category, from, value) {
    const v = toNum(value);
    if (v == null) return null;

    const def = UNIT_DEFS[category];
    if (!def) return null;
    const fromDef = def.units[from];
    if (!fromDef) return null;

    const rows = [];
    for (const [key, u] of Object.entries(def.units)) {
      let converted;
      if (category === 'temperature') {
        const c = toCelsius(v, from);
        if (c == null) return null;
        converted = fromCelsius(c, key);
      } else {
        const baseValue = v * fromDef.factor;
        converted = baseValue / u.factor;
      }
      if (!Number.isFinite(converted)) continue;
      rows.push({
        key,
        name: u.name,
        short: u.short,
        value: round(converted, 6),
        display: smartFormat(round(converted, 6)),
        isSource: key === from,
        isUS: u.us,
      });
    }
    return rows;
  },
};
// ═══════════════════════════════════════════════════════════════════
// BMI
// ═══════════════════════════════════════════════════════════════════
export const bmi = {
  // Metric: weight in kg, height in cm
  calculate(weightKg, heightCm) {
    const w = toNum(weightKg);
    const h = toNum(heightCm);
    if (w == null || h == null || w <= 0 || h <= 0) return null;

    const heightM = h / 100;
    const value = w / (heightM * heightM);
    const rounded = round(value, 1);

    // Category
    let category, tone, color;
    if (value < 16)         { category = 'Severely underweight'; tone = 'bad';  color = '#dc2626'; }
    else if (value < 18.5)  { category = 'Underweight';          tone = 'warn'; color = '#d97706'; }
    else if (value < 25)    { category = 'Normal weight';        tone = 'ok';   color = '#059669'; }
    else if (value < 30)    { category = 'Overweight';           tone = 'warn'; color = '#d97706'; }
    else if (value < 35)    { category = 'Obese (Class I)';      tone = 'bad';  color = '#dc2626'; }
    else if (value < 40)    { category = 'Obese (Class II)';     tone = 'bad';  color = '#dc2626'; }
    else                    { category = 'Obese (Class III)';    tone = 'bad';  color = '#b91c1c'; }

    // Healthy weight range for this height (BMI 18.5 to 24.9)
    const minHealthyKg = 18.5 * heightM * heightM;
    const maxHealthyKg = 24.9 * heightM * heightM;

    // Weight to reach the nearest healthy boundary
    let weightToChange = 0;
    let weightToChangeDir = '';
    if (w < minHealthyKg) {
      weightToChange = minHealthyKg - w;
      weightToChangeDir = 'gain';
    } else if (w > maxHealthyKg) {
      weightToChange = w - maxHealthyKg;
      weightToChangeDir = 'lose';
    }

    // Percentage from the healthy midpoint
    const midHealthy = (minHealthyKg + maxHealthyKg) / 2;
    const percentFromMid = midHealthy > 0 ? ((w - midHealthy) / midHealthy) * 100 : 0;

    // Prime BMI (22 is often cited as optimal)
    const primeWeight = 22 * heightM * heightM;

    // Range markers for the visual scale (position on 0–100%)
    // Map BMI range [15, 40] to 0–100%
    const pct = (v) => Math.max(0, Math.min(100, ((v - 15) / (40 - 15)) * 100));

    return {
      value: rounded,
      display: rounded.toFixed(1),
      detail: `Category: ${category}`,
      formula: `BMI = ${smartFormat(round(w, 1))} kg ÷ (${heightM.toFixed(2)} m)² = ${rounded.toFixed(1)}`,
      category, tone, color,

      // Weight range
      minHealthyKg: round(minHealthyKg, 1),
      maxHealthyKg: round(maxHealthyKg, 1),
      primeWeight:  round(primeWeight, 1),
      weightToChange: round(weightToChange, 1),
      weightToChangeDir,
      percentFromMid: round(percentFromMid, 1),

      // Marker position on the visual scale (0–100)
      markerPct: pct(value),

      fmt: {
        value:          rounded.toFixed(1),
        category,
        minHealthyKg:   smartFormat(round(minHealthyKg, 1)),
        maxHealthyKg:   smartFormat(round(maxHealthyKg, 1)),
        primeWeight:    smartFormat(round(primeWeight, 1)),
        weightToChange: smartFormat(round(weightToChange, 1)),
        weightToChangeDir,
        percentFromMid: (percentFromMid > 0 ? '+' : '') + round(percentFromMid, 1).toFixed(1) + '%',
        heightM:        heightM.toFixed(2),
        weightKg:       smartFormat(round(w, 1)),
      },
    };
  },

  // Imperial: weight in lb, height in inches (or ft + in)
  calculateImperial(weightLb, heightIn) {
    const w = toNum(weightLb);
    const h = toNum(heightIn);
    if (w == null || h == null || w <= 0 || h <= 0) return null;
    // Convert to metric and reuse the main function, then annotate
    const kg = w * 0.45359237;
    const cm = h * 2.54;
    const result = bmi.calculate(kg, cm);
    if (!result) return null;

    // Convert healthy range back to lb for display
    const lbPerKg = 2.20462262;
    return {
      ...result,
      // Override the metric display values with imperial equivalents
      fmt: {
        ...result.fmt,
        minHealthyKg:   smartFormat(round(result.minHealthyKg * lbPerKg, 1)) + ' lb',
        maxHealthyKg:   smartFormat(round(result.maxHealthyKg * lbPerKg, 1)) + ' lb',
        primeWeight:    smartFormat(round(result.primeWeight  * lbPerKg, 1)) + ' lb',
        weightToChange: smartFormat(round(result.weightToChange * lbPerKg, 1)) + ' lb',
        weightKg:       smartFormat(w) + ' lb',
        heightM:        smartFormat(h) + ' in',
      },
      imperial: true,
    };
  },
};
// ═══════════════════════════════════════════════════════════════════
// LOAN
// ═══════════════════════════════════════════════════════════════════
export const loan = {
  calculate(principal, annualRate, years) {
    const p = toNum(principal);
    const r = toNum(annualRate);
    const y = toNum(years);
    if (p == null || r == null || y == null || p <= 0 || y <= 0) return null;

    const monthlyRate = r / 100 / 12;
    const n = Math.round(y * 12);

    let monthly;
    if (monthlyRate === 0) {
      monthly = p / n;
    } else {
      const factor = Math.pow(1 + monthlyRate, n);
      monthly = p * monthlyRate * factor / (factor - 1);
    }

    const totalPaid     = monthly * n;
    const totalInterest = totalPaid - p;

    // Interest as a percentage of principal
    const interestPercent = p > 0 ? (totalInterest / p) * 100 : 0;

    // Effective annual rate (nominal, not APR — no fees included)
    const effectiveRate = monthlyRate * 12 * 100;

    // Amortization schedule — yearly summary
    const yearlySchedule = [];
    let balance = p;
    let yearInterest = 0;
    let yearPrincipal = 0;
    let cumInterest = 0;
    let cumPrincipal = 0;

    for (let m = 1; m <= n; m++) {
      const interestPart = balance * monthlyRate;
      const principalPart = monthly - interestPart;
      balance -= principalPart;
      yearInterest += interestPart;
      yearPrincipal += principalPart;
      cumInterest += interestPart;
      cumPrincipal += principalPart;

      if (m % 12 === 0 || m === n) {
        yearlySchedule.push({
          year: Math.ceil(m / 12),
          interestPaid: round(yearInterest, 2),
          principalPaid: round(yearPrincipal, 2),
          balance: round(Math.max(0, balance), 2),
          cumInterest: round(cumInterest, 2),
          cumPrincipal: round(cumPrincipal, 2),
          percentPaid: round((cumPrincipal / p) * 100, 1),
        });
        yearInterest = 0;
        yearPrincipal = 0;
      }
    }

    // First payment breakdown
    const firstInterest = p * monthlyRate;
    const firstPrincipal = monthly - firstInterest;

    // Last payment breakdown
    const lastBalance = n > 1 ? yearlySchedule[yearlySchedule.length - 2]?.balance ?? p : p;
    const lastInterest = lastBalance * monthlyRate;
    const lastPrincipal = monthly - lastInterest;

    return {
      monthly: round(monthly, 2),
      totalPaid: round(totalPaid, 2),
      totalInterest: round(totalInterest, 2),
      interestPercent: round(interestPercent, 2),
      effectiveRate: round(effectiveRate, 2),
      months: n,
      years: y,
      principal: round(p, 2),

      display: money(round(monthly, 2)) + '/mo',
      detail: `Total paid ${money(round(totalPaid, 2))} · Interest ${money(round(totalInterest, 2))}`,
      formula: `M = ${money(round(monthly, 2))} · ${n} monthly payments · total interest ${money(round(totalInterest, 2))}`,

      yearlySchedule,

      first: {
        interest: round(firstInterest, 2),
        principal: round(firstPrincipal, 2),
      },
      last: {
        interest: round(lastInterest, 2),
        principal: round(lastPrincipal, 2),
      },

      fmt: {
        monthly:         money(round(monthly, 2)),
        totalPaid:       money(round(totalPaid, 2)),
        totalInterest:   money(round(totalInterest, 2)),
        principal:       money(round(p, 2)),
        interestPercent: round(interestPercent, 2).toFixed(2) + '%',
        effectiveRate:   round(effectiveRate, 2).toFixed(2) + '%',
        months:          n.toLocaleString(),
        years:           y.toLocaleString(),
        firstInterest:   money(round(firstInterest, 2)),
        firstPrincipal:  money(round(firstPrincipal, 2)),
        lastInterest:    money(round(lastInterest, 2)),
        lastPrincipal:   money(round(lastPrincipal, 2)),
      },
    };
  },
};
// ═══════════════════════════════════════════════════════════════════
// CASE CONVERTER
// ═══════════════════════════════════════════════════════════════════

// Split text into words, handling camelCase, PascalCase, hyphens,
// underscores, dots and any whitespace.
function splitWords(s) {
  if (!s) return [];
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // camelCase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // HTMLParser → HTML Parser
    .replace(/[-_.]+/g, ' ')                    // separators
    .split(/\s+/)
    .filter(Boolean);
}

export const caseConverter = {
  // Returns an object with every case variant of the input.
  all(text) {
    if (typeof text !== 'string') text = '';
    return [
      { key: 'uppercase',    name: 'UPPERCASE',       desc: 'Every letter capitalised',       value: this.uppercase(text) },
      { key: 'lowercase',    name: 'lowercase',       desc: 'Every letter lowercased',        value: this.lowercase(text) },
      { key: 'title',        name: 'Title Case',      desc: 'First letter of each word',      value: this.title(text) },
      { key: 'sentence',     name: 'Sentence case',   desc: 'First letter of each sentence',  value: this.sentence(text) },
      { key: 'camel',        name: 'camelCase',       desc: 'Words joined, first lowercase',  value: this.camel(text) },
      { key: 'pascal',       name: 'PascalCase',      desc: 'Words joined, all capitalised',  value: this.pascal(text) },
      { key: 'snake',        name: 'snake_case',      desc: 'Lowercase joined with _',        value: this.snake(text) },
      { key: 'kebab',        name: 'kebab-case',      desc: 'Lowercase joined with -',        value: this.kebab(text) },
      { key: 'constant',     name: 'CONSTANT_CASE',   desc: 'Uppercase joined with _',        value: this.constant(text) },
      { key: 'dot',          name: 'dot.case',        desc: 'Lowercase joined with .',        value: this.dot(text) },
      { key: 'alternating',  name: 'aLtErNaTiNg',     desc: 'Letters alternate case',         value: this.alternating(text) },
      { key: 'inverse',      name: 'iNVERSE cASE',    desc: 'Every letter case swapped',      value: this.inverse(text) },
      { key: 'reverse',      name: 'Reverse',         desc: 'Characters in reverse order',    value: this.reverse(text) },
    ];
  },

  uppercase(text) { return String(text).toUpperCase(); },
  lowercase(text) { return String(text).toLowerCase(); },

  title(text) {
    return String(text).replace(/\S+/g, (word) => {
      // Only uppercase the first letter of the word; keep rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  },

  sentence(text) {
    const lower = String(text).toLowerCase();
    return lower.replace(/(^\s*\w|[.!?]\s+\w)/g, (m) => m.toUpperCase());
  },

  camel(text) {
    const words = splitWords(text);
    if (!words.length) return '';
    return words[0].toLowerCase() +
      words.slice(1).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  },

  pascal(text) {
    const words = splitWords(text);
    if (!words.length) return '';
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  },

  snake(text) {
    return splitWords(text).map((w) => w.toLowerCase()).join('_');
  },

  kebab(text) {
    return splitWords(text).map((w) => w.toLowerCase()).join('-');
  },

  constant(text) {
    return splitWords(text).map((w) => w.toUpperCase()).join('_');
  },

  dot(text) {
    return splitWords(text).map((w) => w.toLowerCase()).join('.');
  },

  alternating(text) {
    let i = 0;
    return String(text).replace(/[a-zA-Z]/g, (c) => {
      const out = (i % 2 === 0) ? c.toLowerCase() : c.toUpperCase();
      i++;
      return out;
    });
  },

  inverse(text) {
    return String(text).replace(/[a-zA-Z]/g, (c) => {
      return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase();
    });
  },

  reverse(text) {
    return String(text).split('').reverse().join('');
  },
};
// ═══════════════════════════════════════════════════════════════════
// WORD COUNTER
// ═══════════════════════════════════════════════════════════════════

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','else','of','to','in','on','at',
  'by','for','with','about','against','between','into','through','during',
  'before','after','above','below','from','up','down','out','off','over','under',
  'again','further','once','here','there','when','where','why','how','all','any',
  'both','each','few','more','most','other','some','such','no','nor','not',
  'only','own','same','so','than','too','very','can','will','just','should',
  'now','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','would','could','should','may','might','must','shall','this',
  'that','these','those','i','you','he','she','it','we','they','them','their',
  'our','your','his','her','its','my','me','him','us','as','also','get','got',
  'like','make','made','see','say','said','go','going','went','come','came',
]);

export const wordCounter = {
  analyze(text) {
    if (typeof text !== 'string') text = '';

    const trimmed = text.trim();

    // Words — split on whitespace, then strip punctuation
    const rawWords = trimmed.length
      ? trimmed.split(/\s+/).filter(Boolean)
      : [];

    // Cleaner word list for keyword analysis
    const cleanedWords = rawWords
      .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter(Boolean);

    const wordCount = cleanedWords.length;

    // Characters
    const charCount = text.length;
    const charNoSpaces = text.replace(/\s/g, '').length;

    // Sentences — split on . ! ? followed by space or end
    const sentences = trimmed.length
      ? trimmed
          .split(/(?<=[.!?])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
      : [];
    const sentenceCount = sentences.length;

    // Paragraphs — split on one or more blank lines
    const paragraphs = trimmed.length
      ? trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      : [];
    const paragraphCount = paragraphs.length;

    // Lines
    const lineCount = text.length ? text.split(/\r\n|\r|\n/).length : 0;

    // Reading time — average adult reads ~225 words/minute
    const readingMinutes = wordCount / 225;
    const readingTime = formatDuration(readingMinutes);

    // Speaking time — average speech is ~150 words/minute
    const speakingMinutes = wordCount / 150;
    const speakingTime = formatDuration(speakingMinutes);

    // Longest word
    const longestWord = cleanedWords.reduce(
      (acc, w) => (w.length > acc.length ? w : acc),
      ''
    );

    // Average word length
    const avgWordLength = wordCount
      ? Math.round((charNoSpaces / wordCount) * 10) / 10
      : 0;

    // Keywords — words longer than 3 chars, not stop words
    const freq = new Map();
    for (const w of cleanedWords) {
      const key = w.toLowerCase();
      if (key.length < 4) continue;
      if (STOP_WORDS.has(key)) continue;
      freq.set(key, (freq.get(key) || 0) + 1);
    }
    const keywords = [...freq.entries()]
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
      .slice(0, 8);

    // Density of the top keyword
    const topDensity = keywords.length && wordCount
      ? Math.round((keywords[0].count / wordCount) * 1000) / 10
      : 0;

    return {
      wordCount,
      charCount,
      charNoSpaces,
      sentenceCount,
      paragraphCount,
      lineCount,
      readingTime,
      speakingTime,
      readingMinutes,
      speakingMinutes,
      longestWord,
      avgWordLength,
      keywords,
      topDensity,
    };
  },
};

function formatDuration(minutes) {
  if (!minutes || minutes < 1 / 60) return '0 sec';
  if (minutes < 1) return `${Math.round(minutes * 60)} sec`;
  if (minutes < 60) {
    const m = Math.floor(minutes);
    const s = Math.round((minutes - m) * 60);
    return s ? `${m} min ${s} sec` : `${m} min`;
  }
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m ? `${h} hr ${m} min` : `${h} hr`;
}