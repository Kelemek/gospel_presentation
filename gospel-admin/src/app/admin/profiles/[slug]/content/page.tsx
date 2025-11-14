'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile, GospelSection } from '@/lib/types'
import AdminHeader from '@/components/AdminHeader'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import InlineRichTextEditor from '@/components/InlineRichTextEditor'
import RichTextEditor from '@/components/RichTextEditor'
import { createClient } from '@/lib/supabase/client'

interface ContentEditPageProps {
  params: Promise<{
    slug: string
  }>
}

function ContentEditPage({ params }: ContentEditPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [newScriptureRef, setNewScriptureRef] = useState('')
  const [addingScriptureToSection, setAddingScriptureToSection] = useState<string | null>(null)
  const [newNestedScriptureRef, setNewNestedScriptureRef] = useState('')
  const [addingScriptureToNested, setAddingScriptureToNested] = useState<string | null>(null)
  const [editingScriptureId, setEditingScriptureId] = useState<string | null>(null)
  const [editingScriptureValue, setEditingScriptureValue] = useState('')
  const [draggedItem, setDraggedItem] = useState<{sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number} | null>(null)
  const [dragOverItem, setDragOverItem] = useState<{sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number} | null>(null)
  
  // Question management states
  const [newQuestion, setNewQuestion] = useState('')
  const [addingQuestionToSection, setAddingQuestionToSection] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editingQuestionValue, setEditingQuestionValue] = useState('')
  
  // COMA questions template
  const [showComaTemplateEditor, setShowComaTemplateEditor] = useState(false)
  const [comaTemplate, setComaTemplate] = useState<string[]>([
    "Context: Who wrote it? Who was it written to? What's happening in the surrounding chapters or book? This step helps you avoid misinterpreting verses by placing them in their proper historical and literary setting.",
    "Observation: Look closely at what the passage says. What words or phrases stand out? Are there repeated ideas, contrasts, or commands? What is the structure or flow? This is about noticing the details before jumping to conclusions.",
    "Meaning: Ask what the passage means. What does this teach about God, humanity, or salvation? What is the author's main message? How does this connect to the gospel? This step helps you uncover the theological and spiritual significance.",
    "Application: Apply the passage to your life. What should change in your thoughts, actions, or relationships? Is there a promise to trust or a command to obey? How can you live this out today? This is where Scripture becomes personal and transformative."
  ])
  const [comaInstructions, setComaInstructions] = useState<string>('')
  
  // Load COMA template from database on mount
  useEffect(() => {
    const loadComaTemplate = async () => {
      try {
        const response = await fetch('/api/coma-template')
        if (response.ok) {
          const data = await response.json()
          if (data.template?.questions) {
            setComaTemplate(data.template.questions)
          }
          if (data.template?.instructions) {
            setComaInstructions(data.template.instructions)
          }
        }
      } catch (e) {
        console.error('Failed to load COMA template:', e)
      }
    }
    loadComaTemplate()
  }, [])
  
  // Check authentication on mount
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setIsAuth(!!user)
    if (!user) {
      router.push('/login')
    }
    setIsLoading(false)
  }

  // Bible book abbreviations mapping
  const bibleBookAbbreviations: { [key: string]: string } = {
    // Full book names
    'genesis': 'Genesis', 'exodus': 'Exodus', 'leviticus': 'Leviticus', 'numbers': 'Numbers',
    'deuteronomy': 'Deuteronomy', 'joshua': 'Joshua', 'judges': 'Judges', 'ruth': 'Ruth',
    '1samuel': '1 Samuel', '2samuel': '2 Samuel', '1kings': '1 Kings', '2kings': '2 Kings',
    '1chronicles': '1 Chronicles', '2chronicles': '2 Chronicles', 'ezra': 'Ezra', 'nehemiah': 'Nehemiah',
    'esther': 'Esther', 'job': 'Job', 'psalms': 'Psalms', 'proverbs': 'Proverbs',
    'ecclesiastes': 'Ecclesiastes', 'songofsolomon': 'Song of Solomon', 'isaiah': 'Isaiah',
    'jeremiah': 'Jeremiah', 'lamentations': 'Lamentations', 'ezekiel': 'Ezekiel', 'daniel': 'Daniel',
    'hosea': 'Hosea', 'joel': 'Joel', 'amos': 'Amos', 'obadiah': 'Obadiah', 'jonah': 'Jonah',
    'micah': 'Micah', 'nahum': 'Nahum', 'habakkuk': 'Habakkuk', 'zephaniah': 'Zephaniah',
    'haggai': 'Haggai', 'zechariah': 'Zechariah', 'malachi': 'Malachi', 'matthew': 'Matthew',
    'mark': 'Mark', 'luke': 'Luke', 'john': 'John', 'acts': 'Acts', 'romans': 'Romans',
    '1corinthians': '1 Corinthians', '2corinthians': '2 Corinthians', 'galatians': 'Galatians',
    'ephesians': 'Ephesians', 'philippians': 'Philippians', 'colossians': 'Colossians',
    '1thessalonians': '1 Thessalonians', '2thessalonians': '2 Thessalonians', '1timothy': '1 Timothy',
    '2timothy': '2 Timothy', 'titus': 'Titus', 'philemon': 'Philemon', 'hebrews': 'Hebrews',
    'james': 'James', '1peter': '1 Peter', '2peter': '2 Peter', '1john': '1 John',
    '2john': '2 John', '3john': '3 John', 'jude': 'Jude', 'revelation': 'Revelation',
    
    // Common abbreviated forms
    'gen': 'Genesis', 'exo': 'Exodus', 'lev': 'Leviticus', 'num': 'Numbers', 'deut': 'Deuteronomy',
    'josh': 'Joshua', 'judg': 'Judges', '1sam': '1 Samuel', '2sam': '2 Samuel', '1kgs': '1 Kings',
    '2kgs': '2 Kings', '1chr': '1 Chronicles', '2chr': '2 Chronicles', 'neh': 'Nehemiah',
    'est': 'Esther', 'psa': 'Psalms', 'prov': 'Proverbs', 'eccl': 'Ecclesiastes', 'song': 'Song of Solomon',
    'isa': 'Isaiah', 'jer': 'Jeremiah', 'lam': 'Lamentations', 'ezek': 'Ezekiel', 'dan': 'Daniel',
    'hos': 'Hosea', 'obad': 'Obadiah', 'mic': 'Micah', 'nah': 'Nahum', 'hab': 'Habakkuk',
    'zeph': 'Zephaniah', 'hag': 'Haggai', 'zech': 'Zechariah', 'mal': 'Malachi', 'matt': 'Matthew',
    'rom': 'Romans', '1cor': '1 Corinthians', '2cor': '2 Corinthians', 'gal': 'Galatians',
    'eph': 'Ephesians', 'phil': 'Philippians', 'col': 'Colossians', '1thess': '1 Thessalonians',
    '2thess': '2 Thessalonians', '1tim': '1 Timothy', '2tim': '2 Timothy',
    'heb': 'Hebrews', 'jas': 'James', '1pet': '1 Peter', '2pet': '2 Peter', 'rev': 'Revelation',
    
    // Common abbreviations with spaces (like "1 Thess.")
    '1 thess': '1 Thessalonians', '2 thess': '2 Thessalonians', '1 tim': '1 Timothy', '2 tim': '2 Timothy',
    '1 cor': '1 Corinthians', '2 cor': '2 Corinthians', '1 pet': '1 Peter', '2 pet': '2 Peter',
    '1 john': '1 John', '2 john': '2 John', '3 john': '3 John', '1 sam': '1 Samuel', '2 sam': '2 Samuel',
    '1 kgs': '1 Kings', '2 kgs': '2 Kings', '1 chr': '1 Chronicles', '2 chr': '2 Chronicles',
    
    // Common abbreviations
    'mt': 'Matthew', 'mk': 'Mark', 'lk': 'Luke', 'jn': 'John', 'ro': 'Romans',
    '1co': '1 Corinthians', '2co': '2 Corinthians', 'ga': 'Galatians', 'ep': 'Ephesians',
    'php': 'Philippians', 'phm': 'Philemon', '1th': '1 Thessalonians', '2th': '2 Thessalonians',
    '1ti': '1 Timothy', '2ti': '2 Timothy', 'ti': 'Titus', '1pe': '1 Peter', '2pe': '2 Peter',
    '1jn': '1 John', '2jn': '2 John', '3jn': '3 John', 're': 'Revelation',
    
    // Additional common forms
    'ge': 'Genesis', 'ex': 'Exodus', 'le': 'Leviticus', 'nu': 'Numbers', 'dt': 'Deuteronomy', 'deu': 'Deuteronomy',
    'jos': 'Joshua', 'jdg': 'Judges', 'ru': 'Ruth', 'sa': '1 Samuel', 'kg': '1 Kings',
    'ch': '1 Chronicles', 'ezr': 'Ezra', 'ne': 'Nehemiah', 'es': 'Esther', 'pr': 'Proverbs',
    'ec': 'Ecclesiastes', 'so': 'Song of Songs', 'is': 'Isaiah', 'je': 'Jeremiah',
    'la': 'Lamentations', 'eze': 'Ezekiel', 'da': 'Daniel', 'ho': 'Hosea', 'joe': 'Joel',
    'am': 'Amos', 'ob': 'Obadiah', 'jon': 'Jonah', 'mi': 'Micah', 'na': 'Nahum',
    'hb': 'Habakkuk', 'zep': 'Zephaniah', 'hg': 'Haggai', 'zec': 'Zechariah', 'ml': 'Malachi'
  }

  // Function to resolve bible book abbreviations
  const resolveBibleReference = (reference: string): string => {
    const trimmed = reference.trim()
    
    // Match pattern like "John 3:16" or "1 John 2:15" or "jn 3:16" or "Deut. 32:4"
    const match = trimmed.match(/^(\d*\s*[\w.]+)(\s+\d+:\d+.*)$/)
    if (!match) return trimmed // Return original if doesn't match expected pattern
    
    const bookPart = match[1].trim().toLowerCase().replace(/\.$/, '') // Remove trailing period
    const chapterVerse = match[2]
    
    // Check if it's an abbreviation we can resolve
    const fullBookName = bibleBookAbbreviations[bookPart]
    if (fullBookName) {
      return `${fullBookName}${chapterVerse}`
    }
    
    // If not found, try without numbers for books like "1john" -> "1 john"
    const bookWithoutNumbers = bookPart.replace(/^\d+\s*/, '')
    const numberPrefix = bookPart.match(/^\d+/)
    const fullBookWithoutNumbers = bibleBookAbbreviations[bookWithoutNumbers]
    
    if (fullBookWithoutNumbers && numberPrefix) {
      return `${numberPrefix[0]} ${fullBookWithoutNumbers}${chapterVerse}`
    }
    
    // Return original if no abbreviation found
    return trimmed
  }

  // Resolve params Promise
  useEffect(() => {
    params.then(resolvedParams => {
      setSlug(resolvedParams.slug)
    })
  }, [params])

  useEffect(() => {
    if (slug && isAuth) {
      fetchProfile()
    }
  }, [slug, isAuth])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/profiles/${slug}`)
      if (response.ok) {
        const data = await response.json()
        setProfile(data.profile)
      } else if (response.status === 404) {
        setError('Profile not found')
      } else {
        setError('Failed to load profile')
      }
    } catch (err) {
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveContent = async () => {
    if (!profile) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gospelData: profile.gospelData
        })
      })

      if (response.ok) {
        setHasChanges(false)
        // Show success message
        alert('Content saved successfully!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Failed to save content')
      }
    } catch (err) {
      setError('Failed to save content')
    } finally {
      setIsSaving(false)
    }
  }

  const updateSection = (sectionIndex: number, field: keyof GospelSection, value: any) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      [field]: value
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const updateSubsection = (sectionIndex: number, subsectionIndex: number, field: string, value: any) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const newSubsections = [...newGospelData[sectionIndex].subsections]
    newSubsections[subsectionIndex] = {
      ...newSubsections[subsectionIndex],
      [field]: value
    }
    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      subsections: newSubsections
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const toggleScriptureFavorite = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.scriptureReferences) {
      const newScriptures = [...subsection.scriptureReferences]
      newScriptures[scriptureIndex] = {
        ...newScriptures[scriptureIndex],
        favorite: !newScriptures[scriptureIndex].favorite
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    }
  }

  const addScriptureReference = (sectionIndex: number, subsectionIndex: number) => {
    if (!profile || !newScriptureRef.trim()) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    
    const newScriptures = [...(subsection.scriptureReferences || [])]
    
    // Parse semicolon and comma-separated verses
    const verses = newScriptureRef.split(/[;,]/).map(v => v.trim()).filter(v => v)
    
    // Handle continuation verses (verses without book names)
    let lastBookName = ''
    const processedVerses = verses.map(verse => {
      // If verse starts with a number and we have a previous book, prepend the book name
      if (/^\d+/.test(verse) && lastBookName) {
        return `${lastBookName} ${verse}`
      }
      
      // Extract book name for future continuation verses
      const bookMatch = verse.match(/^(.+?)\s+\d/)
      if (bookMatch) {
        lastBookName = bookMatch[1]
      }
      
      return verse
    })
    
    // Add each resolved verse to the scripture array
    processedVerses.forEach(verse => {
      const resolvedReference = resolveBibleReference(verse.trim())
      newScriptures.push({
        reference: resolvedReference,
        favorite: false
      })
    })
    
    updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    setNewScriptureRef('')
    setAddingScriptureToSection(null)
  }

  const removeScriptureReference = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.scriptureReferences) {
      const newScriptures = [...subsection.scriptureReferences]
      newScriptures.splice(scriptureIndex, 1)
      updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
    }
  }

  // Nested subsection functions
  const toggleNestedScriptureFavorite = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].scriptureReferences) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      const newScriptures = [...newNestedSubsections[nestedIndex].scriptureReferences!]
      newScriptures[scriptureIndex] = {
        ...newScriptures[scriptureIndex],
        favorite: !newScriptures[scriptureIndex].favorite
      }
      newNestedSubsections[nestedIndex] = {
        ...newNestedSubsections[nestedIndex],
        scriptureReferences: newScriptures
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  const removeNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, scriptureIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].scriptureReferences) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      const newScriptures = [...newNestedSubsections[nestedIndex].scriptureReferences!]
      newScriptures.splice(scriptureIndex, 1)
      newNestedSubsections[nestedIndex] = {
        ...newNestedSubsections[nestedIndex],
        scriptureReferences: newScriptures
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  // Functions for editing scripture references
  const startEditingScripture = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number) => {
    const id = nestedIndex !== undefined 
      ? `${sectionIndex}-${subsectionIndex}-${nestedIndex}-${scriptureIndex}`
      : `${sectionIndex}-${subsectionIndex}-${scriptureIndex}`
    
    // Get current scripture reference value
    const section = profile?.gospelData[sectionIndex]
    if (!section) return
    
    let currentReference = ''
    if (nestedIndex !== undefined) {
      // Nested scripture reference
      const nested = section.subsections[subsectionIndex]?.nestedSubsections?.[nestedIndex]
      currentReference = nested?.scriptureReferences?.[scriptureIndex]?.reference || ''
    } else {
      // Regular scripture reference
      currentReference = section.subsections[subsectionIndex]?.scriptureReferences?.[scriptureIndex]?.reference || ''
    }
    
    setEditingScriptureId(id)
    setEditingScriptureValue(currentReference)
  }

  const cancelEditingScripture = () => {
    setEditingScriptureId(null)
    setEditingScriptureValue('')
  }

  const saveEditedScripture = (sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number) => {
    if (!profile || !editingScriptureValue.trim()) return

    const resolvedReference = resolveBibleReference(editingScriptureValue.trim())
    
    if (nestedIndex !== undefined) {
      // Edit nested scripture reference
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].scriptureReferences) {
        const newNestedSubsections = [...subsection.nestedSubsections]
        const newScriptures = [...newNestedSubsections[nestedIndex].scriptureReferences!]
        
        newScriptures[scriptureIndex] = {
          ...newScriptures[scriptureIndex],
          reference: resolvedReference
        }
        
        newNestedSubsections[nestedIndex] = {
          ...newNestedSubsections[nestedIndex],
          scriptureReferences: newScriptures
        }
        
        updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      }
    } else {
      // Edit regular scripture reference
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.scriptureReferences) {
        const newScriptures = [...subsection.scriptureReferences]
        newScriptures[scriptureIndex] = {
          ...newScriptures[scriptureIndex],
          reference: resolvedReference
        }
        updateSubsection(sectionIndex, subsectionIndex, 'scriptureReferences', newScriptures)
      }
    }
    
    setHasChanges(true)
    cancelEditingScripture()
  }

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number) => {
    setDraggedItem({ sectionIndex, subsectionIndex, scriptureIndex, nestedIndex })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, sectionIndex: number, subsectionIndex: number, scriptureIndex: number, nestedIndex?: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem({ sectionIndex, subsectionIndex, scriptureIndex, nestedIndex })
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetSectionIndex: number, targetSubsectionIndex: number, targetScriptureIndex: number, targetNestedIndex?: number) => {
    e.preventDefault()
    
    if (!draggedItem || !profile) return

    const { sectionIndex: sourceSectionIndex, subsectionIndex: sourceSubsectionIndex, scriptureIndex: sourceScriptureIndex, nestedIndex: sourceNestedIndex } = draggedItem

    // Don't do anything if dropped on the same position
    if (sourceSectionIndex === targetSectionIndex && 
        sourceSubsectionIndex === targetSubsectionIndex && 
        sourceScriptureIndex === targetScriptureIndex &&
        sourceNestedIndex === targetNestedIndex) {
      setDraggedItem(null)
      setDragOverItem(null)
      return
    }

    const newGospelData = [...profile.gospelData]

    // Handle nested subsection reordering
    if (sourceNestedIndex !== undefined && targetNestedIndex !== undefined) {
      const sourceSubsection = newGospelData[sourceSectionIndex].subsections[sourceSubsectionIndex]
      const targetSubsection = newGospelData[targetSectionIndex].subsections[targetSubsectionIndex]
      
      if (sourceSubsection.nestedSubsections && targetSubsection.nestedSubsections &&
          sourceSubsection.nestedSubsections[sourceNestedIndex].scriptureReferences &&
          targetSubsection.nestedSubsections[targetNestedIndex].scriptureReferences) {
        
        const sourceScriptures = [...sourceSubsection.nestedSubsections[sourceNestedIndex].scriptureReferences!]
        const targetScriptures = [...targetSubsection.nestedSubsections[targetNestedIndex].scriptureReferences!]
        
        // Remove from source
        const [movedScripture] = sourceScriptures.splice(sourceScriptureIndex, 1)
        
        // Add to target (same location if same array, adjusted if different)
        const adjustedTargetIndex = (sourceSectionIndex === targetSectionIndex && 
                                   sourceSubsectionIndex === targetSubsectionIndex && 
                                   sourceNestedIndex === targetNestedIndex && 
                                   sourceScriptureIndex < targetScriptureIndex) ? 
                                   targetScriptureIndex - 1 : targetScriptureIndex
        
        if (sourceSectionIndex === targetSectionIndex && 
            sourceSubsectionIndex === targetSubsectionIndex && 
            sourceNestedIndex === targetNestedIndex) {
          // Same nested subsection - just reorder
          sourceScriptures.splice(adjustedTargetIndex, 0, movedScripture)
          
          const newNestedSubsections = [...sourceSubsection.nestedSubsections]
          newNestedSubsections[sourceNestedIndex] = {
            ...newNestedSubsections[sourceNestedIndex],
            scriptureReferences: sourceScriptures
          }
          updateSubsection(sourceSectionIndex, sourceSubsectionIndex, 'nestedSubsections', newNestedSubsections)
        } else {
          // Different nested subsections - move between them
          targetScriptures.splice(adjustedTargetIndex, 0, movedScripture)
          
          // Update source
          const sourceNewNestedSubsections = [...sourceSubsection.nestedSubsections]
          sourceNewNestedSubsections[sourceNestedIndex] = {
            ...sourceNewNestedSubsections[sourceNestedIndex],
            scriptureReferences: sourceScriptures
          }
          updateSubsection(sourceSectionIndex, sourceSubsectionIndex, 'nestedSubsections', sourceNewNestedSubsections)
          
          // Update target
          const targetNewNestedSubsections = [...targetSubsection.nestedSubsections]
          targetNewNestedSubsections[targetNestedIndex] = {
            ...targetNewNestedSubsections[targetNestedIndex],
            scriptureReferences: targetScriptures
          }
          updateSubsection(targetSectionIndex, targetSubsectionIndex, 'nestedSubsections', targetNewNestedSubsections)
        }
      }
    }
    // Handle regular subsection reordering
    else if (sourceNestedIndex === undefined && targetNestedIndex === undefined) {
      const sourceSubsection = newGospelData[sourceSectionIndex].subsections[sourceSubsectionIndex]
      const targetSubsection = newGospelData[targetSectionIndex].subsections[targetSubsectionIndex]
      
      if (sourceSubsection.scriptureReferences && targetSubsection.scriptureReferences) {
        const sourceScriptures = [...sourceSubsection.scriptureReferences]
        const targetScriptures = [...targetSubsection.scriptureReferences]
        
        // Remove from source
        const [movedScripture] = sourceScriptures.splice(sourceScriptureIndex, 1)
        
        // Add to target
        const adjustedTargetIndex = (sourceSectionIndex === targetSectionIndex && 
                                   sourceSubsectionIndex === targetSubsectionIndex && 
                                   sourceScriptureIndex < targetScriptureIndex) ? 
                                   targetScriptureIndex - 1 : targetScriptureIndex
        
        if (sourceSectionIndex === targetSectionIndex && sourceSubsectionIndex === targetSubsectionIndex) {
          // Same subsection - just reorder
          sourceScriptures.splice(adjustedTargetIndex, 0, movedScripture)
          updateSubsection(sourceSectionIndex, sourceSubsectionIndex, 'scriptureReferences', sourceScriptures)
        } else {
          // Different subsections - move between them
          targetScriptures.splice(adjustedTargetIndex, 0, movedScripture)
          updateSubsection(sourceSectionIndex, sourceSubsectionIndex, 'scriptureReferences', sourceScriptures)
          updateSubsection(targetSectionIndex, targetSubsectionIndex, 'scriptureReferences', targetScriptures)
        }
      }
    }

    setHasChanges(true)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverItem(null)
  }

  // Functions to create new content
  const createNewSection = () => {
    if (!profile) return

    const newSectionNumber = profile.gospelData.length + 1
    const newSection: GospelSection = {
      section: newSectionNumber.toString(),
      title: `New Section ${newSectionNumber}`,
      subsections: [
        {
          title: 'New Subsection',
          content: 'Add your content here...',
          scriptureReferences: []
        }
      ]
    }

    const newGospelData = [...profile.gospelData, newSection]
    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const createNewSubsection = (sectionIndex: number) => {
    if (!profile) return

    const newSubsection = {
      title: 'New Subsection',
      content: 'Add your content here...',
      scriptureReferences: []
    }

    const newGospelData = [...profile.gospelData]
    const newSubsections = [...newGospelData[sectionIndex].subsections, newSubsection]
    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      subsections: newSubsections
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const createNewNestedSubsection = (sectionIndex: number, subsectionIndex: number) => {
    if (!profile) return

    const newNestedSubsection = {
      title: 'New Sub-subsection',
      content: 'Add your content here...',
      scriptureReferences: []
    }

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    const existingNested = subsection.nestedSubsections || []
    const newNestedSubsections = [...existingNested, newNestedSubsection]
    
    updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
  }

  const updateNestedSubsection = (sectionIndex: number, subsectionIndex: number, nestedIndex: number, field: string, value: any) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    
    if (subsection.nestedSubsections) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      newNestedSubsections[nestedIndex] = {
        ...newNestedSubsections[nestedIndex],
        [field]: value
      }
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  const addNestedScriptureReference = (sectionIndex: number, subsectionIndex: number, nestedIndex: number) => {
    if (!profile || !newNestedScriptureRef.trim()) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    
    if (subsection.nestedSubsections) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      const nested = newNestedSubsections[nestedIndex]
      const existingScriptures = [...(nested.scriptureReferences || [])]
      
      // Parse semicolon and comma-separated verses
      const verses = newNestedScriptureRef.split(/[;,]/).map(v => v.trim()).filter(v => v)
      
      // Handle continuation verses (verses without book names)
      let lastBookName = ''
      const processedVerses = verses.map(verse => {
        // If verse starts with a number and we have a previous book, prepend the book name
        if (/^\d+/.test(verse) && lastBookName) {
          return `${lastBookName} ${verse}`
        }
        
        // Extract book name for future continuation verses
        const bookMatch = verse.match(/^(.+?)\s+\d/)
        if (bookMatch) {
          lastBookName = bookMatch[1]
        }
        
        return verse
      })
      
      // Add each resolved verse to the scripture array
      processedVerses.forEach(verse => {
        const resolvedReference = resolveBibleReference(verse.trim())
        existingScriptures.push({
          reference: resolvedReference,
          favorite: false
        })
      })
      
      newNestedSubsections[nestedIndex] = {
        ...nested,
        scriptureReferences: existingScriptures
      }
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      setNewNestedScriptureRef('')
      setAddingScriptureToNested(null)
    }
  }

  // Question Management Functions
  const addQuestion = (sectionIndex: number, subsectionIndex: number, nestedIndex?: number) => {
    if (!profile || !newQuestion.trim()) return

    const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newQuestionObj = {
      id: questionId,
      question: newQuestion.trim(),
      maxLength: 2000, // Default max length for answers
      createdAt: new Date()
    }

    if (nestedIndex !== undefined) {
      // Add to nested subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.nestedSubsections) {
        const newNestedSubsections = [...subsection.nestedSubsections]
        const nested = newNestedSubsections[nestedIndex]
        const existingQuestions = [...(nested.questions || [])]
        existingQuestions.push(newQuestionObj)
        
        newNestedSubsections[nestedIndex] = {
          ...nested,
          questions: existingQuestions
        }
        
        updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      }
    } else {
      // Add to regular subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      const existingQuestions = [...(subsection.questions || [])]
      existingQuestions.push(newQuestionObj)
      
      updateSubsection(sectionIndex, subsectionIndex, 'questions', existingQuestions)
    }

    setNewQuestion('')
    setAddingQuestionToSection(null)
  }

  const removeQuestion = (sectionIndex: number, subsectionIndex: number, questionIndex: number, nestedIndex?: number) => {
    if (!profile) return

    if (nestedIndex !== undefined) {
      // Remove from nested subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].questions) {
        const newNestedSubsections = [...subsection.nestedSubsections]
        const newQuestions = [...newNestedSubsections[nestedIndex].questions!]
        newQuestions.splice(questionIndex, 1)
        
        newNestedSubsections[nestedIndex] = {
          ...newNestedSubsections[nestedIndex],
          questions: newQuestions
        }
        
        updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      }
    } else {
      // Remove from regular subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.questions) {
        const newQuestions = [...subsection.questions]
        newQuestions.splice(questionIndex, 1)
        updateSubsection(sectionIndex, subsectionIndex, 'questions', newQuestions)
      }
    }
  }

  const startEditingQuestion = (sectionIndex: number, subsectionIndex: number, questionIndex: number, nestedIndex?: number) => {
    const id = nestedIndex !== undefined 
      ? `${sectionIndex}-${subsectionIndex}-${nestedIndex}-${questionIndex}`
      : `${sectionIndex}-${subsectionIndex}-${questionIndex}`
    
    const section = profile?.gospelData[sectionIndex]
    if (!section) return
    
    let currentQuestion = ''
    if (nestedIndex !== undefined) {
      const nested = section.subsections[subsectionIndex]?.nestedSubsections?.[nestedIndex]
      currentQuestion = nested?.questions?.[questionIndex]?.question || ''
    } else {
      currentQuestion = section.subsections[subsectionIndex]?.questions?.[questionIndex]?.question || ''
    }
    
    setEditingQuestionId(id)
    setEditingQuestionValue(currentQuestion)
  }

  const cancelEditingQuestion = () => {
    setEditingQuestionId(null)
    setEditingQuestionValue('')
  }

  const saveEditedQuestion = (sectionIndex: number, subsectionIndex: number, questionIndex: number, nestedIndex?: number) => {
    if (!profile || !editingQuestionValue.trim()) return

    if (nestedIndex !== undefined) {
      // Edit nested subsection question
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.nestedSubsections && subsection.nestedSubsections[nestedIndex].questions) {
        const newNestedSubsections = [...subsection.nestedSubsections]
        const newQuestions = [...newNestedSubsections[nestedIndex].questions!]
        
        newQuestions[questionIndex] = {
          ...newQuestions[questionIndex],
          question: editingQuestionValue.trim()
        }
        
        newNestedSubsections[nestedIndex] = {
          ...newNestedSubsections[nestedIndex],
          questions: newQuestions
        }
        
        updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      }
    } else {
      // Edit regular subsection question
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.questions) {
        const newQuestions = [...subsection.questions]
        newQuestions[questionIndex] = {
          ...newQuestions[questionIndex],
          question: editingQuestionValue.trim()
        }
        updateSubsection(sectionIndex, subsectionIndex, 'questions', newQuestions)
      }
    }
    
    setHasChanges(true)
    cancelEditingQuestion()
  }

  // Delete Functions
  const deleteSection = (sectionIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    newGospelData.splice(sectionIndex, 1)
    
    // Renumber remaining sections
    newGospelData.forEach((section, index) => {
      section.section = (index + 1).toString()
    })

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const deleteSubsection = (sectionIndex: number, subsectionIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const newSubsections = [...newGospelData[sectionIndex].subsections]
    newSubsections.splice(subsectionIndex, 1)
    
    // Don't allow deleting the last subsection
    if (newSubsections.length === 0) {
      alert('Cannot delete the last subsection. A section must have at least one subsection.')
      return
    }

    newGospelData[sectionIndex] = {
      ...newGospelData[sectionIndex],
      subsections: newSubsections
    }

    setProfile({
      ...profile,
      gospelData: newGospelData
    })
    setHasChanges(true)
  }

  const deleteNestedSubsection = (sectionIndex: number, subsectionIndex: number, nestedIndex: number) => {
    if (!profile) return

    const newGospelData = [...profile.gospelData]
    const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
    
    if (subsection.nestedSubsections) {
      const newNestedSubsections = [...subsection.nestedSubsections]
      newNestedSubsections.splice(nestedIndex, 1)
      
      updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
    }
  }

  // COMA Questions Functions
  const applyComaQuestions = (sectionIndex: number, subsectionIndex: number, nestedIndex?: number) => {
    if (!profile) return

    const newQuestions = comaTemplate.map(questionText => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question: questionText,
      maxLength: 2000,
      createdAt: new Date()
    }))

    if (nestedIndex !== undefined) {
      // Apply to nested subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      
      if (subsection.nestedSubsections) {
        const newNestedSubsections = [...subsection.nestedSubsections]
        const existingQuestions = newNestedSubsections[nestedIndex].questions || []
        
        newNestedSubsections[nestedIndex] = {
          ...newNestedSubsections[nestedIndex],
          questions: [...existingQuestions, ...newQuestions]
        }
        
        updateSubsection(sectionIndex, subsectionIndex, 'nestedSubsections', newNestedSubsections)
      }
    } else {
      // Apply to regular subsection
      const newGospelData = [...profile.gospelData]
      const subsection = newGospelData[sectionIndex].subsections[subsectionIndex]
      const existingQuestions = [...(subsection.questions || [])]
      
      updateSubsection(sectionIndex, subsectionIndex, 'questions', [...existingQuestions, ...newQuestions])
    }
  }

  const saveComaTemplate = async (newTemplate: string[], newInstructions?: string) => {
    setComaTemplate(newTemplate)
    if (newInstructions !== undefined) {
      setComaInstructions(newInstructions)
    }
    
    // Save to database
    try {
      const body: { questions: string[]; instructions?: string } = { questions: newTemplate }
      if (newInstructions !== undefined) {
        body.instructions = newInstructions
      }
      
      const response = await fetch('/api/coma-template', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
      
      if (!response.ok) {
        console.error('Failed to save COMA template to database')
      }
    } catch (error) {
      console.error('Error saving COMA template:', error)
    }
  }

  if (!isAuth || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" role="status" aria-label="Loading"></div>
          <p className="text-slate-600">Loading profile content...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-lg">
            <div className="text-red-600 text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/admin"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AdminHeader
          title={profile ? profile.title : "Content Editor"}
          description={profile?.description || "Edit gospel presentation content and scripture references"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <>
              <Link
                href={`/${slug}?preview=true`}
                target="_blank"
                className="text-slate-600 hover:text-slate-800 text-sm font-medium bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Preview →
              </Link>
              
              <button
                onClick={() => setShowComaTemplateEditor(!showComaTemplateEditor)}
                className="text-slate-600 hover:text-slate-800 text-sm font-medium bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                {showComaTemplateEditor ? 'Hide' : 'Edit'} COMA Template
              </button>

              <button
                onClick={handleSaveContent}
                disabled={isSaving || !hasChanges}
                className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex-1 sm:flex-none"
              >
                {isSaving ? (
                  <>
                    <span className="hidden sm:inline">Saving...</span>
                    <span className="sm:hidden">Saving</span>
                  </>
                ) : hasChanges ? (
                  <>
                    <span className="hidden sm:inline">Save Changes</span>
                    <span className="sm:hidden">Save</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">No Changes</span>
                    <span className="sm:hidden">✓</span>
                  </>
                )}
              </button>
            </>
          }
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* COMA Template Editor */}
        {showComaTemplateEditor && (
          <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 mb-6 shadow-lg">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Edit COMA Template</h3>
            <p className="text-sm text-slate-600 mb-6">
              Edit the default COMA questions and instructions that appear when users click "C.O.M.A." in the text.
            </p>
            
            {/* COMA Instructions */}
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                COMA Instructions (shown when clicking "C.O.M.A." in text)
              </label>
              <p className="text-xs text-slate-500 mb-2">
                You can use rich text formatting with the toolbar below.
              </p>
              <RichTextEditor
                value={comaInstructions}
                onChange={(newValue) => saveComaTemplate(comaTemplate, newValue)}
                multiline
                as="div"
                className="w-full text-sm"
                placeholder="Enter COMA method instructions..."
              />
            </div>

            {/* COMA Questions */}
            <div>
              <h4 className="text-lg font-semibold text-slate-800 mb-2">COMA Questions</h4>
              <p className="text-sm text-slate-600 mb-4">
                These questions will be applied when you click "Apply COMA" on any subsection.
              </p>
              <div className="space-y-4">
              {comaTemplate.map((question, index) => (
                <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-700">
                      Question {index + 1}
                    </label>
                    <button
                      onClick={() => {
                        const newTemplate = comaTemplate.filter((_, i) => i !== index)
                        saveComaTemplate(newTemplate)
                      }}
                      className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                      title="Remove this question"
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Use the rich text toolbar for formatting.
                  </p>
                  <RichTextEditor
                    value={question}
                    onChange={(newValue) => {
                      const newTemplate = [...comaTemplate]
                      newTemplate[index] = newValue
                      saveComaTemplate(newTemplate)
                    }}
                    multiline
                    as="div"
                    className="w-full text-sm"
                    placeholder="Enter question text..."
                  />
                </div>
              ))}
              <button
                onClick={() => {
                  const newTemplate = [...comaTemplate, '']
                  saveComaTemplate(newTemplate)
                }}
                className="text-green-600 hover:text-green-800 text-sm font-medium border border-green-200 hover:border-green-300 px-3 py-2 rounded bg-green-50 hover:bg-green-100 transition-colors"
              >
                + Add Question to Template
              </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Editor */}
        {profile && profile.gospelData.map((section, sectionIndex) => (
          <div key={section.section} className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 mb-6 shadow-lg">
            <div className="mb-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <InlineRichTextEditor
                    value={section.title}
                    onChange={(newTitle) => {
                      updateSection(sectionIndex, 'title', newTitle)
                      setHasChanges(true)
                    }}
                    className="text-2xl font-bold text-slate-800 w-full"
                    placeholder="Section title..."
                    as="h2"
                  />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete section ${section.section}. "${section.title}"? This will delete all subsections, scriptures, and questions within it. This action cannot be undone.`)) {
                        deleteSection(sectionIndex)
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 hover:border-red-300 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                    title="Delete section"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>

            {/* Subsections */}
            <div className="space-y-6">
              {section.subsections.map((subsection, subsectionIndex) => (
                <div key={subsectionIndex} className="border-l-4 border-slate-300 pl-6 mb-6 bg-slate-50 rounded-r-lg py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <InlineRichTextEditor
                        value={subsection.title}
                        onChange={(newTitle) => {
                          updateSubsection(sectionIndex, subsectionIndex, 'title', newTitle)
                          setHasChanges(true)
                        }}
                        className="text-xl font-bold text-slate-800 w-full"
                        placeholder="Subsection title..."
                        as="h3"
                      />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to delete the subsection "${subsection.title}"? This will delete all scriptures and questions within it. This action cannot be undone.`)) {
                            deleteSubsection(sectionIndex, subsectionIndex)
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 hover:border-red-300 px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                        title="Delete subsection"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="pr-2">
                    <RichTextEditor
                      value={subsection.content}
                      onChange={(newContent) => {
                        updateSubsection(sectionIndex, subsectionIndex, 'content', newContent)
                        setHasChanges(true)
                      }}
                      className="text-slate-700 mb-4 leading-relaxed w-full block"
                      placeholder="Click to edit content..."
                      multiline
                      as="p"
                    />
                  </div>

                  {/* Scripture References */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-3 pr-2">
                      <h4 className="text-sm font-medium text-slate-700">Scripture References:</h4>
                      <button
                        onClick={() => {
                          const sectionKey = `${sectionIndex}-${subsectionIndex}`
                          setAddingScriptureToSection(addingScriptureToSection === sectionKey ? null : sectionKey)
                          setNewScriptureRef('')
                        }}
                          className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-300 px-2 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          {addingScriptureToSection === `${sectionIndex}-${subsectionIndex}` ? 'Cancel' : (
                            <>
                              <span className="hidden sm:inline">+ Add Scripture</span>
                              <span className="sm:hidden">+ Add</span>
                            </>
                          )}
                      </button>
                    </div>

                    {addingScriptureToSection === `${sectionIndex}-${subsectionIndex}` && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newScriptureRef}
                            onChange={(e) => setNewScriptureRef(e.target.value)}
                            placeholder="e.g., John 3:16 or Rom 3:23; 6:23; 10:9-10"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                addScriptureReference(sectionIndex, subsectionIndex)
                              }
                            }}
                          />
                          <button
                            onClick={() => addScriptureReference(sectionIndex, subsectionIndex)}
                            disabled={!newScriptureRef.trim()}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}

                    {subsection.scriptureReferences && subsection.scriptureReferences.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {subsection.scriptureReferences.map((scripture, scriptureIndex) => {
                          const editId = `${sectionIndex}-${subsectionIndex}-${scriptureIndex}`
                          const isEditing = editingScriptureId === editId
                          const isDragging = draggedItem?.sectionIndex === sectionIndex && 
                                           draggedItem?.subsectionIndex === subsectionIndex && 
                                           draggedItem?.scriptureIndex === scriptureIndex &&
                                           draggedItem?.nestedIndex === undefined
                          const isDragOver = dragOverItem?.sectionIndex === sectionIndex && 
                                           dragOverItem?.subsectionIndex === subsectionIndex && 
                                           dragOverItem?.scriptureIndex === scriptureIndex &&
                                           dragOverItem?.nestedIndex === undefined
                          
                          return (
                            <div 
                              key={scriptureIndex} 
                              className={`relative group ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                              draggable={!isEditing}
                              onDragStart={(e) => handleDragStart(e, sectionIndex, subsectionIndex, scriptureIndex)}
                              onDragOver={(e) => handleDragOver(e, sectionIndex, subsectionIndex, scriptureIndex)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, sectionIndex, subsectionIndex, scriptureIndex)}
                              onDragEnd={handleDragEnd}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-300 rounded-md p-1">
                                  <input
                                    type="text"
                                    value={editingScriptureValue}
                                    onChange={(e) => setEditingScriptureValue(e.target.value)}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        saveEditedScripture(sectionIndex, subsectionIndex, scriptureIndex)
                                      } else if (e.key === 'Escape') {
                                        cancelEditingScripture()
                                      }
                                    }}
                                    className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    placeholder="e.g., John 3:16"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => saveEditedScripture(sectionIndex, subsectionIndex, scriptureIndex)}
                                    disabled={!editingScriptureValue.trim()}
                                    className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                                    title="Save changes"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelEditingScripture}
                                    className="bg-gray-600 text-white px-2 py-1 rounded text-xs hover:bg-gray-700 transition-colors"
                                    title="Cancel editing"
                                  >
                                    ✗
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center">
                                    <div 
                                      className="drag-handle cursor-move p-1 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                                      title="Drag to reorder"
                                    >
                                      <svg width="8" height="12" viewBox="0 0 8 12" fill="none" className="text-gray-400">
                                        <circle cx="2" cy="2" r="1" fill="currentColor"/>
                                        <circle cx="6" cy="2" r="1" fill="currentColor"/>
                                        <circle cx="2" cy="6" r="1" fill="currentColor"/>
                                        <circle cx="6" cy="6" r="1" fill="currentColor"/>
                                        <circle cx="2" cy="10" r="1" fill="currentColor"/>
                                        <circle cx="6" cy="10" r="1" fill="currentColor"/>
                                      </svg>
                                    </div>
                                    <ScriptureHoverModal reference={scripture.reference} hoverDelayMs={1000}>
                                      <button
                                        onClick={() => toggleScriptureFavorite(sectionIndex, subsectionIndex, scriptureIndex)}
                                        className={`inline-block px-3 py-1 text-sm rounded-md transition-colors cursor-pointer ${
                                          scripture.favorite
                                            ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border-2 border-blue-400 hover:border-blue-500 font-medium'
                                            : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 hover:border-blue-300'
                                        }`}
                                      >
                                        {scripture.favorite ? '⭐' : '☆'} {scripture.reference}
                                      </button>
                                    </ScriptureHoverModal>
                                  </div>
                                  <button
                                    onClick={() => removeScriptureReference(sectionIndex, subsectionIndex, scriptureIndex)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Remove scripture"
                                  >
                                    ×
                                  </button>
                                  <button
                                    onClick={() => startEditingScripture(sectionIndex, subsectionIndex, scriptureIndex)}
                                    className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                                    title="Edit scripture reference"
                                  >
                                    ✏️
                                  </button>
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">No scripture references yet. Click "Add Scripture" to add some.</p>
                    )}
                    
                    <p className="text-xs text-slate-500 mt-2">
                      Click scripture to toggle favorite (⭐), hover for 1 sec to preview verse text, hover and click × to remove, ✏️ to edit, drag ⋮⋮ to reorder
                    </p>
                  </div>

                  {/* Questions & Answers */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3 pr-2 flex-wrap gap-2">
                      <h4 className="text-sm font-medium text-slate-700">Questions & Answers:</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => applyComaQuestions(sectionIndex, subsectionIndex)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:border-blue-300 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                          title="Apply COMA questions template"
                        >
                          <span className="hidden sm:inline">Apply COMA</span>
                          <span className="sm:hidden">COMA</span>
                        </button>
                        <button
                          onClick={() => {
                            const sectionKey = `${sectionIndex}-${subsectionIndex}`
                            setAddingQuestionToSection(addingQuestionToSection === sectionKey ? null : sectionKey)
                            setNewQuestion('')
                          }}
                          className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-300 px-2 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          {addingQuestionToSection === `${sectionIndex}-${subsectionIndex}` ? 'Cancel' : (
                            <>
                              <span className="hidden sm:inline">+ Add Question</span>
                              <span className="sm:hidden">+ Q</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {addingQuestionToSection === `${sectionIndex}-${subsectionIndex}` && (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3">
                        <div className="flex flex-col gap-2">
                          <RichTextEditor
                            value={newQuestion}
                            onChange={(newValue) => setNewQuestion(newValue)}
                            placeholder="Enter your question (max 500 characters)"
                            multiline
                            as="div"
                            className="w-full text-sm"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">{newQuestion.length}/500 characters</span>
                            <button
                              onClick={() => addQuestion(sectionIndex, subsectionIndex)}
                              disabled={!newQuestion.trim()}
                              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add Question
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {subsection.questions && subsection.questions.length > 0 ? (
                      <div className="space-y-3 pr-2">
                        {subsection.questions.map((question, questionIndex) => {
                          const editId = `${sectionIndex}-${subsectionIndex}-${questionIndex}`
                          const isEditing = editingQuestionId === editId
                          
                          return (
                            <div 
                              key={question.id} 
                              className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex-1">
                                  {isEditing ? (
                                    <div className="space-y-2">
                                      <RichTextEditor
                                        value={editingQuestionValue}
                                        onChange={(newValue) => setEditingQuestionValue(newValue)}
                                        multiline
                                        as="div"
                                        className="w-full text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => saveEditedQuestion(sectionIndex, subsectionIndex, questionIndex)}
                                          disabled={!editingQuestionValue.trim()}
                                          className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1 rounded text-xs transition-colors disabled:opacity-50"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={cancelEditingQuestion}
                                          className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-3 py-1 rounded text-xs transition-colors"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-slate-700 font-medium">Q: {question.question}</p>
                                  )}
                                </div>
                                {!isEditing && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => startEditingQuestion(sectionIndex, subsectionIndex, questionIndex)}
                                      className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                      title="Edit question"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => removeQuestion(sectionIndex, subsectionIndex, questionIndex)}
                                      className="text-slate-600 hover:text-slate-800 text-xs px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                      title="Remove question"
                                    >
                                      ×
                                    </button>
                                  </div>
                                )}
                              </div>
                              {!isEditing && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Answer field will be shown to users viewing this profile (max {question.maxLength || 2000} characters)
                                </p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm italic">No questions yet. Click "Add Question" to create reflection questions.</p>
                    )}
                  </div>

                  {/* Nested Subsections */}
                  {subsection.nestedSubsections && subsection.nestedSubsections.map((nested, nestedIndex) => (
                    <div key={nestedIndex} className="ml-4 mt-4 border-l-2 border-slate-300 pl-4 bg-gradient-to-r from-slate-25 to-blue-25 rounded-r-lg py-3">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <InlineRichTextEditor
                            value={nested.title}
                            onChange={(newTitle) => {
                              updateNestedSubsection(sectionIndex, subsectionIndex, nestedIndex, 'title', newTitle)
                              setHasChanges(true)
                            }}
                            className="font-medium text-slate-800 w-full"
                            placeholder="Nested subsection title..."
                            as="h4"
                          />
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this sub-subsection? This action cannot be undone.')) {
                                deleteNestedSubsection(sectionIndex, subsectionIndex, nestedIndex)
                              }
                            }}
                            className="text-red-600 hover:text-red-800 text-xs font-medium border border-red-200 hover:border-red-300 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                            title="Delete sub-subsection"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="pr-2">
                        <RichTextEditor
                          value={nested.content}
                          onChange={(newContent) => {
                            updateNestedSubsection(sectionIndex, subsectionIndex, nestedIndex, 'content', newContent)
                            setHasChanges(true)
                          }}
                          className="text-slate-700 text-sm mb-2 w-full block"
                          placeholder="Click to edit content..."
                          multiline
                          as="p"
                        />
                      </div>
                      
                      {/* Nested Scripture References */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2 pr-2">
                          <h5 className="text-xs font-medium text-slate-600">Scripture References:</h5>
                          <button
                            onClick={() => {
                              const nestedKey = `${sectionIndex}-${subsectionIndex}-${nestedIndex}`
                              setAddingScriptureToNested(addingScriptureToNested === nestedKey ? null : nestedKey)
                              setNewNestedScriptureRef('')
                            }}
                            className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-300 px-1.5 py-0.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
                          >
                            {addingScriptureToNested === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` ? 'Cancel' : (
                              <>
                                <span className="hidden sm:inline">+ Add Scripture</span>
                                <span className="sm:hidden">+ Add</span>
                              </>
                            )}
                          </button>
                        </div>

                        {addingScriptureToNested === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` && (
                          <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newNestedScriptureRef}
                                onChange={(e) => setNewNestedScriptureRef(e.target.value)}
                                placeholder="e.g., Rom 6:23; 10:9, 13; Eph 2:8-9"
                                className="flex-1 px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    addNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex)
                                  }
                                }}
                              />
                              <button
                                onClick={() => addNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex)}
                                disabled={!newNestedScriptureRef.trim()}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {nested.scriptureReferences && nested.scriptureReferences.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {nested.scriptureReferences.map((scripture, scriptureIndex) => {
                              const editId = `${sectionIndex}-${subsectionIndex}-${nestedIndex}-${scriptureIndex}`
                              const isEditing = editingScriptureId === editId
                              const isDragging = draggedItem?.sectionIndex === sectionIndex && 
                                               draggedItem?.subsectionIndex === subsectionIndex && 
                                               draggedItem?.scriptureIndex === scriptureIndex &&
                                               draggedItem?.nestedIndex === nestedIndex
                              const isDragOver = dragOverItem?.sectionIndex === sectionIndex && 
                                               dragOverItem?.subsectionIndex === subsectionIndex && 
                                               dragOverItem?.scriptureIndex === scriptureIndex &&
                                               dragOverItem?.nestedIndex === nestedIndex
                              
                              return (
                                <div 
                                  key={scriptureIndex} 
                                  className={`relative group ${isDragging ? 'opacity-50' : ''} ${isDragOver ? 'ring-2 ring-blue-400' : ''}`}
                                  draggable={!isEditing}
                                  onDragStart={(e) => handleDragStart(e, sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)}
                                  onDragOver={(e) => handleDragOver(e, sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={(e) => handleDrop(e, sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)}
                                  onDragEnd={handleDragEnd}
                                >
                                  {isEditing ? (
                                    <div className="flex items-center gap-1 bg-yellow-50 border border-yellow-300 rounded p-1">
                                      <input
                                        type="text"
                                        value={editingScriptureValue}
                                        onChange={(e) => setEditingScriptureValue(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            saveEditedScripture(sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)
                                          } else if (e.key === 'Escape') {
                                            cancelEditingScripture()
                                          }
                                        }}
                                        className="text-xs px-1 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="e.g., John 3:16"
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => saveEditedScripture(sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)}
                                        disabled={!editingScriptureValue.trim()}
                                        className="bg-green-600 text-white px-1 py-0.5 rounded text-xs hover:bg-green-700 transition-colors disabled:opacity-50"
                                        title="Save changes"
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={cancelEditingScripture}
                                        className="bg-gray-600 text-white px-1 py-0.5 rounded text-xs hover:bg-gray-700 transition-colors"
                                        title="Cancel editing"
                                      >
                                        ✗
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center">
                                        <div 
                                          className="drag-handle cursor-move p-0.5 opacity-0 group-hover:opacity-100 transition-opacity mr-1"
                                          title="Drag to reorder"
                                        >
                                          <svg width="6" height="10" viewBox="0 0 6 10" fill="none" className="text-gray-400">
                                            <circle cx="1.5" cy="1.5" r="0.8" fill="currentColor"/>
                                            <circle cx="4.5" cy="1.5" r="0.8" fill="currentColor"/>
                                            <circle cx="1.5" cy="5" r="0.8" fill="currentColor"/>
                                            <circle cx="4.5" cy="5" r="0.8" fill="currentColor"/>
                                            <circle cx="1.5" cy="8.5" r="0.8" fill="currentColor"/>
                                            <circle cx="4.5" cy="8.5" r="0.8" fill="currentColor"/>
                                          </svg>
                                        </div>
                                        <ScriptureHoverModal reference={scripture.reference} hoverDelayMs={1000}>
                                          <button
                                            onClick={() => toggleNestedScriptureFavorite(sectionIndex, subsectionIndex, nestedIndex, scriptureIndex)}
                                            className={`inline-block px-2 py-1 text-xs rounded transition-colors cursor-pointer ${
                                              scripture.favorite
                                                ? 'bg-blue-200 hover:bg-blue-300 text-blue-900 border border-blue-400 font-medium'
                                                : 'bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200'
                                            }`}
                                            title={scripture.favorite ? 'Click to unfavorite' : 'Click to favorite'}
                                          >
                                            {scripture.favorite ? '⭐' : '☆'} {scripture.reference}
                                          </button>
                                        </ScriptureHoverModal>
                                      </div>
                                      <button
                                        onClick={() => removeNestedScriptureReference(sectionIndex, subsectionIndex, nestedIndex, scriptureIndex)}
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        title="Remove scripture"
                                      >
                                        ×
                                      </button>
                                      <button
                                        onClick={() => startEditingScripture(sectionIndex, subsectionIndex, scriptureIndex, nestedIndex)}
                                        className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full w-4 h-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-600"
                                        title="Edit scripture reference"
                                      >
                                        ✏️
                                      </button>
                                    </>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic">No scripture references yet.</p>
                        )}
                      </div>

                      {/* Nested Questions & Answers */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2 pr-2 flex-wrap gap-2">
                          <h5 className="text-xs font-medium text-slate-600">Questions & Answers:</h5>
                          <div className="flex gap-1">
                            <button
                              onClick={() => applyComaQuestions(sectionIndex, subsectionIndex, nestedIndex)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:border-blue-300 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                              title="Apply COMA questions template"
                            >
                              <span className="hidden sm:inline">Apply COMA</span>
                              <span className="sm:hidden">COMA</span>
                            </button>
                            <button
                              onClick={() => {
                                const nestedQuestionKey = `${sectionIndex}-${subsectionIndex}-${nestedIndex}`
                                setAddingQuestionToSection(addingQuestionToSection === nestedQuestionKey ? null : nestedQuestionKey)
                                setNewQuestion('')
                              }}
                              className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-300 px-1.5 py-0.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
                            >
                              {addingQuestionToSection === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` ? 'Cancel' : (
                                <>
                                  <span className="hidden sm:inline">+ Add Question</span>
                                  <span className="sm:hidden">+ Q</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {addingQuestionToSection === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` && (
                          <div className="bg-slate-50 border border-slate-200 rounded p-2 mb-2">
                            <div className="flex flex-col gap-2">
                              <RichTextEditor
                                value={newQuestion}
                                onChange={(newValue) => setNewQuestion(newValue)}
                                placeholder="Enter your question (max 500 characters)"
                                multiline
                                as="div"
                                className="w-full text-xs"
                              />
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">{newQuestion.length}/500</span>
                                <button
                                  onClick={() => addQuestion(sectionIndex, subsectionIndex, nestedIndex)}
                                  disabled={!newQuestion.trim()}
                                  className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-2 py-1 rounded text-xs transition-colors disabled:opacity-50"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {nested.questions && nested.questions.length > 0 ? (
                          <div className="space-y-2 pr-2">
                            {nested.questions.map((question, questionIndex) => {
                              const editId = `${sectionIndex}-${subsectionIndex}-${nestedIndex}-${questionIndex}`
                              const isEditing = editingQuestionId === editId
                              
                              return (
                                <div 
                                  key={question.id} 
                                  className="bg-white border border-slate-200 rounded p-2 hover:border-slate-300 transition-colors"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1">
                                      {isEditing ? (
                                        <div className="space-y-2">
                                          <RichTextEditor
                                            value={editingQuestionValue}
                                            onChange={(newValue) => setEditingQuestionValue(newValue)}
                                            multiline
                                            as="div"
                                            className="w-full text-xs"
                                          />
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => saveEditedQuestion(sectionIndex, subsectionIndex, questionIndex, nestedIndex)}
                                              disabled={!editingQuestionValue.trim()}
                                              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-2 py-0.5 rounded text-xs transition-colors disabled:opacity-50"
                                            >
                                              Save
                                            </button>
                                            <button
                                              onClick={cancelEditingQuestion}
                                              className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-700 border border-slate-200 hover:border-slate-300 px-2 py-0.5 rounded text-xs transition-colors"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-slate-700 font-medium text-xs">Q: {question.question}</p>
                                      )}
                                    </div>
                                    {!isEditing && (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => startEditingQuestion(sectionIndex, subsectionIndex, questionIndex, nestedIndex)}
                                          className="text-slate-600 hover:text-slate-800 text-xs px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
                                          title="Edit question"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => removeQuestion(sectionIndex, subsectionIndex, questionIndex, nestedIndex)}
                                          className="text-slate-600 hover:text-slate-800 text-xs px-1 py-0.5 rounded hover:bg-slate-100 transition-colors"
                                          title="Remove question"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  {!isEditing && (
                                    <p className="text-xs text-slate-400 mt-0.5">
                                      Answer field (max {question.maxLength || 2000} chars)
                                    </p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs italic">No questions yet.</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Add New Nested Subsection Button */}
                  <div className="ml-6 mt-4 mb-2 mr-4">
                    <button
                      onClick={() => createNewNestedSubsection(sectionIndex, subsectionIndex)}
                      className="text-green-600 hover:text-green-800 text-xs font-medium border border-green-200 hover:border-green-300 px-2 py-1 rounded bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      + Add Sub-subsection
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Add New Subsection Button */}
              <div className="mt-6 mb-4 text-center px-4">
                <button
                  onClick={() => createNewSubsection(sectionIndex)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium border border-green-200 hover:border-green-300 px-3 py-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
                >
                  + Add Subsection
                </button>
              </div>

              {/* Section Save Button */}
              <div className="mt-6 pt-4 border-t border-slate-200 text-center">
                <button
                  onClick={handleSaveContent}
                  disabled={isSaving || !hasChanges}
                  className="bg-green-600 text-white px-4 sm:px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <span className="hidden sm:inline">Saving...</span>
                      <span className="sm:hidden">Saving</span>
                    </>
                  ) : hasChanges ? (
                    <>
                      <span className="hidden sm:inline">Save Changes</span>
                      <span className="sm:hidden">Save</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">No Changes</span>
                      <span className="sm:hidden">✓</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add New Section Button */}
        {profile && (
          <div className="text-center mt-8 mb-4 px-4">
            <button
              onClick={createNewSection}
              className="text-green-600 hover:text-green-800 text-sm font-medium border border-green-200 hover:border-green-300 px-3 py-1.5 rounded bg-green-50 hover:bg-green-100 transition-colors"
            >
              + Add Section
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Export named for testing to allow focused rendering in unit tests
export { ContentEditPage }
export default ContentEditPage