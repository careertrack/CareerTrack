import { Router, Response } from 'express';
import pool from '../db';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/users/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, role, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users  (admin only)
router.get('/', authenticate, requireAdmin, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await pool.query(
      'SELECT id, email, display_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id/assessments  (admin only)
router.get('/:id/assessments', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const userResult = await pool.query(
      'SELECT id, email, display_name, role, created_at FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const assessments = await pool.query(
      `SELECT a.*, u.display_name, u.email
       FROM assessments a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );
    res.json({ user: userResult.rows[0], assessments: assessments.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/users/:id/role  (admin only)
router.patch('/:id/role', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role } = req.body;

  if (!role || !['student', 'admin'].includes(role)) {
    res.status(400).json({ error: 'role must be "student" or "admin"' });
    return;
  }

  // Prevent self-demotion
  if (id === req.user!.userId && role === 'student') {
    res.status(400).json({ error: 'You cannot demote yourself' });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2 
       RETURNING id, email, display_name, role`,
      [role, id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
