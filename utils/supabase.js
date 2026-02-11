// ============================================================
// SUPABASE DATABASE CONNECTION
// ============================================================
// This file handles all database connections to Supabase
// ============================================================

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY // Use service key for backend (has full access)
);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Execute a database query safely
 * @param {string} table - Table name
 * @param {string} operation - 'select', 'insert', 'update', 'delete'
 * @param {object} data - Data for operation
 * @returns {Promise} Query result
 */
async function query(table, operation, data = {}) {
    try {
        let result;
        
        switch(operation) {
            case 'select':
                result = await supabase
                    .from(table)
                    .select(data.select || '*')
                    .match(data.where || {})
                    .order(data.orderBy || 'created_at', { ascending: false })
                    .limit(data.limit || 100);
                break;
                
            case 'insert':
                result = await supabase
                    .from(table)
                    .insert(data.values)
                    .select();
                break;
                
            case 'update':
                result = await supabase
                    .from(table)
                    .update(data.values)
                    .match(data.where)
                    .select();
                break;
                
            case 'delete':
                result = await supabase
                    .from(table)
                    .delete()
                    .match(data.where);
                break;
                
            default:
                throw new Error(`Invalid operation: ${operation}`);
        }
        
        if (result.error) {
            throw result.error;
        }
        
        return result.data;
        
    } catch (error) {
        console.error(`Database error in ${table}.${operation}:`, error);
        throw error;
    }
}

/**
 * Get single record by ID
 */
async function findById(table, id) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Get single record by condition
 */
async function findOne(table, where) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .match(where)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Check if record exists
 */
async function exists(table, where) {
    const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .match(where);
    
    if (error) throw error;
    return count > 0;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    supabase,
    query,
    findById,
    findOne,
    exists
};
