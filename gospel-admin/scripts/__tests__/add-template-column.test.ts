import { readFileSync } from 'fs'
import { join } from 'path'

describe('add-template-column.sql migration', () => {
  const sqlPath = join(__dirname, '..', 'add-template-column.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  test('contains ALTER TABLE to add is_template boolean column with default false', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+profiles[\s\S]*ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+is_template\s+BOOLEAN\s+DEFAULT\s+false/i)
  })

  test('marks default profile as template via UPDATE', () => {
    expect(sql).toMatch(/UPDATE\s+profiles[\s\S]*SET\s+is_template\s*=\s*true[\s\S]*WHERE\s+is_default\s*=\s*true/i)
  })

  test('select includes is_template column', () => {
    expect(sql).toMatch(/SELECT[\s\S]*is_template[\s\S]*FROM\s+profiles/i)
  })
})
