
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local')
let envContent = ''
try {
    envContent = fs.readFileSync(envPath, 'utf-8')
} catch (e) {
    console.error('Could not read .env.local')
    process.exit(1)
}

const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
        env[match[1].trim()] = match[2].trim()
    }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY']

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
    console.log('Checking questions table schema...')

    // Try to select category from questions
    const { data, error } = await supabase
        .from('questions')
        .select('id, category')
        .limit(1)

    if (error) {
        console.error('Error selecting category:', error)
    } else {
        console.log('Successfully selected category column.')
        console.log('Sample data:', data)
    }

    // Check if we can update category
    if (data && data.length > 0) {
        const question = data[0]
        const newCategory = question.category === 'formal' ? 'test' : 'formal'

        console.log(`Attempting to update question ${question.id} category to ${newCategory}...`)

        const { data: updated, error: updateError } = await supabase
            .from('questions')
            .update({ category: newCategory })
            .eq('id', question.id)
            .select()

        if (updateError) {
            console.error('Error updating category:', updateError)
        } else {
            console.log('Successfully updated category.')
            console.log('Updated data:', updated)

            // Revert change
            console.log('Reverting change...')
            await supabase
                .from('questions')
                .update({ category: question.category })
                .eq('id', question.id)
        }
    }
}

checkSchema()
