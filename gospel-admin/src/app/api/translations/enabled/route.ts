import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: settings, error } = await supabase
      .from('translation_settings')
      .select('translation_code, translation_name, display_order')
      .eq('is_enabled', true)
      .order('display_order', { ascending: true }) as {
        data: Array<{ translation_code: string; translation_name: string; display_order: number }> | null;
        error: any;
      }

    if (error) {
      logger.error('Error fetching enabled translations:', error)
      // Return default if error
      return NextResponse.json({ 
        translations: [
          { translation_code: 'esv', translation_name: 'ESV (English Standard Version)', display_order: 1 }
        ] 
      })
    }

    // Always ensure ESV is in the list as fallback
    const hasESV = settings?.some(s => s.translation_code === 'esv')
    if (!hasESV && settings) {
      settings.unshift({ 
        translation_code: 'esv', 
        translation_name: 'ESV (English Standard Version)', 
        display_order: 0 
      })
    }

    return NextResponse.json({ translations: settings || [] })
  } catch (error) {
    logger.error('Enabled translations fetch error:', error)
    return NextResponse.json({ 
      translations: [
        { translation_code: 'esv', translation_name: 'ESV (English Standard Version)', display_order: 1 }
      ] 
    })
  }
}
