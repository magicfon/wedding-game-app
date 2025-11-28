-- Add category column to questions table
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'formal';

-- Add check constraint to ensure valid categories
ALTER TABLE questions 
ADD CONSTRAINT questions_category_check 
CHECK (category IN ('formal', 'test', 'backup'));

-- Add active_question_set column to game_state table
ALTER TABLE game_state 
ADD COLUMN IF NOT EXISTS active_question_set text DEFAULT 'formal';

-- Add check constraint to ensure valid active_question_set
ALTER TABLE game_state 
ADD CONSTRAINT game_state_active_question_set_check 
CHECK (active_question_set IN ('formal', 'test', 'backup'));

-- Update existing questions to be in 'formal' category (if not already set)
UPDATE questions SET category = 'formal' WHERE category IS NULL;
