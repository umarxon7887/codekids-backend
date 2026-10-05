import { Router } from 'express';
import { q } from '../db.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { resultsLimiter } from '../middleware/security.js';
import { z } from 'zod';

export const router = Router();

// Xavfsiz natija saqlash (Server tomonidan hisoblash)
router.post('/results', resultsLimiter, optionalAuth, async (req, res) => {
  try {
    // 1. Validatsiya
    const schema = z.object({
      content_id: z.number().int(),
      typed_text: z.string().max(5000),
      started_at: z.number().int(), // Frontend dan kelgan boshlanish vaqti (ms)
      game_mode: z.enum(['solo', 'group']).default('solo'),
      room_code: z.string().optional()
    });
    
    const validated = schema.parse(req.body);

    // 2. Asl matnni bazadan olish
    const contentRes = await q('SELECT data FROM contents WHERE id = $1 AND type = \'typing_text\'', [validated.content_id]);
    if (!contentRes.rows.length) {
      return res.status(404).json({ error: { code: 'CONTENT_NOT_FOUND', message: 'Matn topilmadi' } });
    }

    const originalText = contentRes.rows[0].data.text;
    const endedAt = Date.now();
    const durationMs = endedAt - validated.started_at;
    const durationMin = durationMs / 60000;

    // 3. Anti-cheat: Juda tez yozilgan bo'lsa (masalan, 1 soniyada 100 ta harf)
    if (durationMin < 0.05) { // 3 soniyadan kam
      return res.status(400).json({ error: { code: 'TOO_FAST', message: 'Natija juda tez kiritildi' } });
    }

    // 4. Aniqlikni hisoblash (Server tomonida!)
    let correctChars = 0;
    const minLength = Math.min(validated.typed_text.length, originalText.length);
    
    for (let i = 0; i < minLength; i++) {
      if (validated.typed_text[i] === originalText[i]) {
        correctChars++;
      }
    }

    // WPM = (To'g'ri belgilar / 5) / daqiqa
    const wpm = Math.round((correctChars / 5) / durationMin);
    const accuracy = Math.round((correctChars / Math.max(validated.typed_text.length, 1)) * 100);

    // 5. Shubhali natijani belgilash (Bolalar uchun 150+ WPM real emas)
    const flagged = wpm > 150 || accuracy < 50;

    // 6. Bazaga saqlash
    const result = await q(
      `INSERT INTO typing_results 
       (user_id, game_mode, language, level, wpm, accuracy, time_sec, text_length, room_code, flagged) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user?.id || null,
        validated.game_mode,
        'uz', // Default
        'medium', // Default
        wpm,
        accuracy,
        durationMin,
        validated.typed_text.length,
        validated.room_code || null,
        flagged
      ]
    );

    res.json({ 
      ok: true, 
      data: { 
        wpm, 
        accuracy, 
        flagged,
        id: result.rows[0].id 
      } 
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: error.errors } });
    }
    console.error('Typing result error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Ichki xatolik' } });
  }
});

router.get('/best', auth, async (req, res) => {
  // Faqat flagged = false (haqiqiy) natijalarni hisoblash
  const r = await q(
    `SELECT language, MAX(wpm) as best_wpm, MAX(accuracy) as best_accuracy, MIN(time_sec) as best_time
     FROM typing_results WHERE user_id = $1 AND flagged = false GROUP BY language`,
    [req.user.id]
  );
  res.json(r.rows);
});

router.get('/history', auth, async (req, res) => {
  const { limit = 50 } = req.query;
  const r = await q(
    'SELECT * FROM typing_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [req.user.id, parseInt(limit)]
  );
  res.json(r.rows);
});
