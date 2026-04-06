const supabase = require('../config/supabase');

function getDisplayName(user) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    (user?.email ? user.email.split('@')[0] : null)
  );
}

async function ensureUserProfile(user) {
  const userId = user?.id;

  if (!userId) {
    throw new Error('Cannot ensure profile without a user id');
  }

  const { data: existing, error: existingError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    return existing;
  }

  const profile = {
    id: userId,
    name: getDisplayName(user),
    email: user.email || null,
    role: 'user',
  };

  const { data, error } = await supabase
    .from('users')
    .upsert([profile], { onConflict: 'id' })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  ensureUserProfile,
};
