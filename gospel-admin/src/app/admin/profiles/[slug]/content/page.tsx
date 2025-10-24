'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GospelProfile, GospelSection } from '@/lib/types'
import AdminLogin from '@/components/AdminLogin'
import AdminHeader from '@/components/AdminHeader'
import ScriptureHoverModal from '@/components/ScriptureHoverModal'
import { isAuthenticated } from '@/lib/auth'

interface ContentEditPageProps {
  params: Promise<{
    slug: string
  }>
}

export default function ContentEditPage({ params }: ContentEditPageProps) {
  const router = useRouter()
  const [slug, setSlug] = useState<string>('')
  const [profile, setProfile] = useState<GospelProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null)
  const [editingSubsectionId, setEditingSubsectionId] = useState<string | null>(null)
  const [editingNestedSubsectionId, setEditingNestedSubsectionId] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [newScriptureRef, setNewScriptureRef] = useState('')
  const [addingScriptureToSection, setAddingScriptureToSection] = useState<string | null>(null)
  const [newNestedScriptureRef, setNewNestedScriptureRef] = useState('')
  const [addingScriptureToNested, setAddingScriptureToNested] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [editingScriptureId, setEditingScriptureId] = useState<string | null>(null)
  const [editingScriptureValue, setEditingScriptureValue] = useState('')

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

  // Check authentication on mount
  useEffect(() => {
    setIsAuth(isAuthenticated())
    setIsLoading(false)
  }, [])

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

  // Backup and Restore Functions
  const downloadBackup = () => {
    if (!profile) return

    const backupData = {
      profileInfo: {
        title: profile.title,
        slug: profile.slug,
        description: profile.description
      },
      gospelData: profile.gospelData,
      exportedAt: new Date().toISOString(),
      exportedBy: 'Gospel Presentation Admin'
    }

    const dataStr = JSON.stringify(backupData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gospel-profile-${profile.slug}-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleFileRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!confirm(`Are you sure you want to restore from "${file.name}"? This will replace all current content and cannot be undone.`)) {
      event.target.value = '' // Reset the input
      return
    }

    setIsRestoring(true)
    setError('')

    try {
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      // Validate backup file structure
      if (!backupData.gospelData || !Array.isArray(backupData.gospelData)) {
        throw new Error('Invalid backup file format: missing or invalid gospelData')
      }

      // Update the profile with restored data
      const updatedProfile = {
        ...profile!,
        gospelData: backupData.gospelData
      }
      setProfile(updatedProfile)
      setHasChanges(true)

      // Auto-save the restored content
      const response = await fetch(`/api/profiles/${slug}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gospelData: backupData.gospelData
        })
      })

      if (response.ok) {
        setHasChanges(false)
        alert(`Successfully restored content from "${file.name}"!`)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to save restored content')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore backup'
      setError(`Restore failed: ${errorMessage}`)
      alert(`Restore failed: ${errorMessage}`)
    } finally {
      setIsRestoring(false)
      event.target.value = '' // Reset the input
    }
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

  const handleLogin = () => {
    setIsAuth(true)
  }

  if (!isAuth) {
    return <AdminLogin onLogin={handleLogin} />
  }

  if (isLoading) {
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
          title={profile ? `${profile.title}` : "Content Editor"}
          description={profile?.description || "Edit gospel presentation content and scripture references"}
          currentProfileSlug={slug}
          showProfileSwitcher={true}
          actions={
            <>
              <Link
                href={`/admin/profiles/${slug}`}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Profile Settings
              </Link>
              <Link
                href={`/${slug}`}
                target="_blank"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Preview →
              </Link>

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

        {/* Backup & Restore Info Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-medium text-slate-800 mb-1">Profile Data Management</h3>
              <div className="text-xs text-slate-600 space-y-1">
                <div><strong>Backup:</strong> Download your current profile data as a JSON file for safekeeping.</div>
                <div><strong>Restore:</strong> Upload a previously saved backup file to replace current content.</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 lg:flex-shrink-0">
              <button
                onClick={downloadBackup}
                disabled={!profile}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-center"
                title="Download profile backup"
              >
                <span className="hidden sm:inline">📥 Download Backup</span>
                <span className="sm:hidden">📥 Backup</span>
              </button>
              
              <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:shadow-sm cursor-pointer text-center block">
                <span className="hidden sm:inline">{isRestoring ? '⏳ Restoring...' : '📤 Upload & Restore'}</span>
                <span className="sm:hidden">{isRestoring ? '⏳ Restoring...' : '📤 Restore'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileRestore}
                  disabled={isRestoring}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Content Editor */}
        {profile && profile.gospelData.map((section, sectionIndex) => (
          <div key={section.section} className="bg-white border border-slate-200 rounded-lg p-4 sm:p-6 mb-6 shadow-lg">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-slate-800 pr-4">
                  {section.section}. {section.title}
                </h2>
                <button
                  onClick={() => setEditingSectionId(editingSectionId === sectionIndex ? null : sectionIndex)}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:border-blue-300 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0 mr-2"
                >
                  {editingSectionId === sectionIndex ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editingSectionId === sectionIndex && (
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-lg p-4 mb-4 shadow-sm">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSection(sectionIndex, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Subsections */}
            <div className="space-y-6">
              {section.subsections.map((subsection, subsectionIndex) => (
                <div key={subsectionIndex} className="border-l-4 border-slate-300 pl-6 mb-6 bg-slate-50 rounded-r-lg py-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-slate-800 pr-4">
                      {subsection.title}
                    </h3>
                    <button
                      onClick={() => {
                        const id = `${sectionIndex}-${subsectionIndex}`
                        setEditingSubsectionId(editingSubsectionId === id ? null : id)
                      }}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium border border-blue-200 hover:border-blue-300 px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors flex-shrink-0 ml-4 mr-2"
                    >
                      {editingSubsectionId === `${sectionIndex}-${subsectionIndex}` ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  {editingSubsectionId === `${sectionIndex}-${subsectionIndex}` && (
                    <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200 rounded-lg p-4 mb-4 shadow-sm">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Subsection Title
                          </label>
                          <input
                            type="text"
                            value={subsection.title}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            Content
                          </label>
                          <textarea
                            value={subsection.content}
                            onChange={(e) => updateSubsection(sectionIndex, subsectionIndex, 'content', e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-slate-700 mb-4 leading-relaxed">
                    {subsection.content}
                  </p>

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
                          
                          return (
                            <div key={scriptureIndex} className="relative group">
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
                                  <ScriptureHoverModal reference={scripture.reference}>
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
                      Click scripture to toggle favorite (⭐), hover for 1 sec to preview verse text, hover and click × to remove, ✏️ to edit
                    </p>
                  </div>

                  {/* Nested Subsections */}
                  {subsection.nestedSubsections && subsection.nestedSubsections.map((nested, nestedIndex) => (
                    <div key={nestedIndex} className="ml-4 mt-4 border-l-2 border-slate-300 pl-4 bg-gradient-to-r from-slate-25 to-blue-25 rounded-r-lg py-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-800 pr-3">{nested.title}</h4>
                        <button
                          onClick={() => {
                            const id = `${sectionIndex}-${subsectionIndex}-${nestedIndex}`
                            setEditingNestedSubsectionId(editingNestedSubsectionId === id ? null : id)
                          }}
                          className="text-purple-600 hover:text-purple-800 text-xs font-medium border border-purple-200 hover:border-purple-300 px-1.5 py-0.5 rounded bg-purple-50 hover:bg-purple-100 transition-colors flex-shrink-0 ml-2 mr-1"
                        >
                          {editingNestedSubsectionId === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` ? 'Cancel' : 'Edit'}
                        </button>
                      </div>

                      {editingNestedSubsectionId === `${sectionIndex}-${subsectionIndex}-${nestedIndex}` && (
                        <div className="bg-gradient-to-br from-purple-50 to-slate-50 border border-purple-200 rounded-lg p-3 mb-3 shadow-sm">
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Sub-subsection Title
                              </label>
                              <input
                                type="text"
                                value={nested.title}
                                onChange={(e) => updateNestedSubsection(sectionIndex, subsectionIndex, nestedIndex, 'title', e.target.value)}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1">
                                Content
                              </label>
                              <textarea
                                value={nested.content}
                                onChange={(e) => updateNestedSubsection(sectionIndex, subsectionIndex, nestedIndex, 'content', e.target.value)}
                                rows={3}
                                className="w-full px-2 py-1 border border-slate-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="text-slate-700 text-sm mb-2">{nested.content}</p>
                      
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
                              
                              return (
                                <div key={scriptureIndex} className="relative group">
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
                                      <ScriptureHoverModal reference={scripture.reference}>
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