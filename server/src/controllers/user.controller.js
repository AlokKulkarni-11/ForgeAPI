const supabase = require('../config/supabase');
const { ensureUserProfile } = require('../services/userProfile.service');

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    await ensureUserProfile(req.user);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .update({ name })
      .eq('id', userId)
      .select('id, name, email, role, created_at')
      .single();

    if (error) throw error;
    res.json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
