const supabase = require('../config/supabase');

const save = async (apiId, agent, level, message, metadata = null, iteration = null) => {
  try {
    const logEntry = {
      api_id: apiId,
      agent,
      level,
      message,
      metadata,
      iteration
    };

    // 1. Insert into database
    const { error } = await supabase
      .from('pipeline_logs')
      .insert([logEntry])
      .select()
      .single();

    if (error) {
      console.error('Database log insert failed:', error);
      return;
    }

    console.log(`[${agent.toUpperCase()}] ${level.toUpperCase()}: ${message}`);
  } catch (err) {
    console.error('Log Service Error:', err);
  }
};

const listByApi = async (apiId) => {
  const { data, error } = await supabase
    .from('pipeline_logs')
    .select('*')
    .eq('api_id', apiId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
};

module.exports = { save, listByApi };
