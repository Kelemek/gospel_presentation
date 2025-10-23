'use client'

import { useState } from 'react'
import { gospelPresentationData } from '@/lib/data'
import ScriptureModal from '@/components/ScriptureModal'
import TableOfContents from '@/components/TableOfContents'
import GospelSection from '@/components/GospelSection'
import Link from 'next/link'

export default function GospelPresentation() {
  const [selectedScripture, setSelectedScripture] = useState<{
    reference: string
    isOpen: boolean
    context?: {
      sectionTitle: string
      subsectionTitle: string
      content: string
    }
  }>({ reference: '', isOpen: false })
  
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Collect all scripture references with context in order
  const allScriptureRefs = gospelPresentationData.flatMap(section => 
    section.subsections.flatMap(subsection => [
      ...(subsection.scriptureReferences || []).map(ref => ({
        reference: ref.reference,
        context: {
          sectionTitle: `${section.section}. ${section.title}`,
          subsectionTitle: subsection.title,
          content: subsection.content
        }
      })),
      ...(subsection.nestedSubsections?.flatMap(nested => 
        (nested.scriptureReferences || []).map(ref => ({
          reference: ref.reference,
          context: {
            sectionTitle: `${section.section}. ${section.title}`,
            subsectionTitle: `${subsection.title} - ${nested.title}`,
            content: nested.content
          }
        }))
      ) || [])
    ])
  )

  const currentIndex = allScriptureRefs.findIndex(ref => ref.reference === selectedScripture.reference)
  const hasPrevious = currentIndex > 0
  const hasNext = currentIndex < allScriptureRefs.length - 1

  const handleScriptureClick = (reference: string) => {
    // Find the context for this reference
    const refWithContext = allScriptureRefs.find(ref => ref.reference === reference)
    setSelectedScripture({ 
      reference, 
      isOpen: true,
      context: refWithContext?.context
    })
  }

  const closeModal = () => {
    setSelectedScripture({ reference: '', isOpen: false })
  }

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const goToPreviousScripture = () => {
    if (hasPrevious) {
      const previousRef = allScriptureRefs[currentIndex - 1]
      setSelectedScripture({ 
        reference: previousRef.reference, 
        isOpen: true,
        context: previousRef.context
      })
    }
  }

  const goToNextScripture = () => {
    if (hasNext) {
      const nextRef = allScriptureRefs[currentIndex + 1]
      setSelectedScripture({ 
        reference: nextRef.reference, 
        isOpen: true,
        context: nextRef.context
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-br from-slate-700 to-slate-800 text-white text-center py-10 shadow-lg">
        <div className="container mx-auto px-5">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            Presenting the Gospel in its Context
          </h1>
          <h2 className="text-xl md:text-2xl mb-4 opacity-90">
            Faithfully Sowing the Seed According to the Scriptures
          </h2>
          <p className="text-lg italic opacity-80 mb-2">
            "The Gospel Presentation" with Highlighted Scriptures for Easy Reference
          </p>
          <p className="text-base opacity-70 mb-4">
            By Dr. Stuart Scott
          </p>
          <div className="mt-6">
            <Link 
              href="/admin"
              className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              📝 Edit Content (Admin)
            </Link>
          </div>
        </div>
      </header>

      {/* Hamburger Menu Button */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <div className="container mx-auto px-5 py-3">
          <button
            onClick={toggleMenu}
            className="flex items-center gap-3 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-md transition-colors"
          >
            <div className="flex flex-col gap-1">
              <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`}></div>
              <div className={`w-5 h-0.5 bg-white transition-opacity ${isMenuOpen ? 'opacity-0' : ''}`}></div>
              <div className={`w-5 h-0.5 bg-white transition-transform ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></div>
            </div>
            <span className="font-medium">Table of Contents</span>
          </button>
        </div>
      </div>

      {/* Collapsible Menu Overlay */}
      {isMenuOpen && (
        <>
          {/* Invisible click area to close menu */}
          <div className="fixed inset-0 z-40" onClick={closeMenu}></div>
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 z-50 bg-white w-64 h-full shadow-2xl overflow-y-auto border-r border-gray-200 transform transition-transform duration-300 ease-in-out">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-700">
                  Table of Contents
                </h3>
                <button
                  onClick={closeMenu}
                  className="text-slate-500 hover:text-slate-700 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              <div onClick={closeMenu}>
                <TableOfContents sections={gospelPresentationData} />
              </div>
            </div>
          </div>
        </>
      )}

      <main className="container mx-auto px-5 py-10">
        <div className="space-y-12">
          {gospelPresentationData.map((section) => (
            <GospelSection 
              key={section.section}
              section={section}
              onScriptureClick={handleScriptureClick}
            />
          ))}
        </div>
      </main>

      <footer className="bg-slate-700 text-white text-center py-8 mt-16">
        <div className="container mx-auto px-5">
          <p className="mb-4">
            You may download the PowerPoint presentation of this appendix on{' '}
            <a 
              href="http://www.oneeightycounseling.com" 
              target="_blank" 
              rel="noopener"
              className="text-blue-300 hover:text-blue-200 underline"
            >
              www.oneeightycounseling.com
            </a>
          </p>
          <p className="text-sm opacity-80">
            Scripture quotations are from the ESV® Bible.
          </p>
        </div>
      </footer>

      <ScriptureModal 
        reference={selectedScripture.reference}
        isOpen={selectedScripture.isOpen}
        onClose={closeModal}
        onPrevious={goToPreviousScripture}
        onNext={goToNextScripture}
        hasPrevious={currentIndex > 0}
        hasNext={currentIndex < allScriptureRefs.length - 1}
        context={selectedScripture.context}
      />
    </div>
  )
}
