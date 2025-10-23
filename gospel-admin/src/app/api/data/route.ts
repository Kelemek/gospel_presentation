import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile } from 'fs/promises'
import { join } from 'path'

// API route for managing gospel presentation data
export async function GET() {
  try {
    // Read current data file
    const dataPath = join(process.cwd(), 'src/lib/data.ts')
    const fileContent = await readFile(dataPath, 'utf-8')
    
    // Extract the data object (this is a simple approach - in production you might want more robust parsing)
    const dataMatch = fileContent.match(/export const gospelPresentationData = (\[[\s\S]*?\]);/)
    
    if (!dataMatch) {
      return NextResponse.json({ error: 'Could not parse data file' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true,
      rawContent: fileContent,
      dataContent: dataMatch[1]
    })
  } catch (error) {
    console.error('Data API GET error:', error)
    return NextResponse.json({ error: 'Failed to read data file' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, password } = await request.json()
    
    // Simple authentication check
    if (password !== 'gospel2024') { // In production, use proper auth
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    
    // Write updated data file
    const dataPath = join(process.cwd(), 'src/lib/data.ts')
    await writeFile(dataPath, content, 'utf-8')
    
    return NextResponse.json({ 
      success: true,
      message: 'Data updated successfully'
    })
  } catch (error) {
    console.error('Data API POST error:', error)
    return NextResponse.json({ error: 'Failed to update data file' }, { status: 500 })
  }
}