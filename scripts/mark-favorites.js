// Script to mark bolded scriptures as favorites
// This script will identify and mark the bolded scriptures from the RTF file

const fs = require('fs');
const path = require('path');

// List of bolded scripture references extracted from the RTF file
const boldedScriptures = [
  'Ps. 86:8', 'Psalm 86:8',
  'Deut. 6:4', 'Deuteronomy 6:4',
  'Matt. 28:19', 'Matthew 28:19',
  'Gen. 1:26', 'Genesis 1:26',
  'Isa. 46:9-11', 'Isaiah 46:9-11', 'Isa. 46:9–11', 'Isaiah 46:9–11',
  'Isa. 57:15', 'Isaiah 57:15',
  'Ps. 5:4', 'Psalm 5:4',
  '1 John 1:5',
  'Deut. 32:4', 'Deuteronomy 32:4',
  'Deut. 10:12-13', 'Deuteronomy 10:12-13', 'Deut. 10:12–13', 'Deuteronomy 10:12–13',
  'Ps. 16:11', 'Psalm 16:11',
  'Gen. 1:27-30', 'Genesis 1:27-30', 'Gen. 1:27–30', 'Genesis 1:27–30',
  'Gen. 2:15-17', 'Genesis 2:15-17', 'Gen. 2:15–17', 'Genesis 2:15–17',
  'Gen. 3:8', 'Genesis 3:8',
  'Jude 6',
  'Gen. 3:1-7', 'Genesis 3:1-7', 'Gen. 3:1–7', 'Genesis 3:1–7',
  'Rom. 3:23', 'Romans 3:23',
  'Rom. 5:12', 'Romans 5:12',
  'Rom. 5:18', 'Romans 5:18',
  'Ezek. 18:2', 'Ezekiel 18:2',
  'Ezek. 18:20', 'Ezekiel 18:20',
  'Gen. 3:8-24', 'Genesis 3:8-24', 'Gen. 3:8–24', 'Genesis 3:8–24',
  'Isa. 59:2', 'Isaiah 59:2',
  'Rom. 1:18', 'Romans 1:18',
  'Matt. 10:28', 'Matthew 10:28',
  'Matt. 13:38-42', 'Matthew 13:38-42', 'Matt. 13:38–42', 'Matthew 13:38–42',
  'Matt. 13:49-50', 'Matthew 13:49-50', 'Matt. 13:49–50', 'Matthew 13:49–50',
  'Jer. 17:9-10', 'Jeremiah 17:9-10', 'Jer. 17:9–10', 'Jeremiah 17:9–10',
  'Rom. 3:10-18', 'Romans 3:10-18', 'Rom. 3:10–18', 'Romans 3:10–18',
  'Eph. 2:8-9', 'Ephesians 2:8-9', 'Eph. 2:8–9', 'Ephesians 2:8–9',
  'John 1:13',
  'John 1:12-13', 'John 1:12–13',
  'John 6:44',
  'John 6:65',
  'Matt. 18:21-35', 'Matthew 18:21-35', 'Matt. 18:21–35', 'Matthew 18:21–35',
  'Eph. 2:12', 'Ephesians 2:12',
  'Lam. 3:31-33', 'Lamentations 3:31-33', 'Lam. 3:31–33', 'Lamentations 3:31–33',
  'Rom. 11:33-34', 'Romans 11:33-34', 'Rom. 11:33–34', 'Romans 11:33–34',
  'Matt. 5:43-48', 'Matthew 5:43-48', 'Matt. 5:43–48', 'Matthew 5:43–48',
  'John 6:37',
  'Prov. 15:8-9', 'Proverbs 15:8-9', 'Prov. 15:8–9', 'Proverbs 15:8–9',
  'John 3:16',
  'John 1:1',
  'John 1:14',
  'Heb. 4:15', 'Hebrews 4:15',
  '2 Cor. 5:21', '2 Corinthians 5:21',
  'Isa. 53:10-11', 'Isaiah 53:10-11', 'Isa. 53:10–11', 'Isaiah 53:10–11',
  '1 Peter 1:3-5', '1 Pet. 1:3-5', '1 Peter 1:3–5', '1 Pet. 1:3–5',
  'Rom. 6:23', 'Romans 6:23',
  'Rom. 10:13', 'Romans 10:13',
  'Rom. 3:24-26', 'Romans 3:24-26', 'Rom. 3:24–26', 'Romans 3:24–26',
  'John 14:1-6', 'John 14:1–6',
  'John 4:23',
  'John 1:12',
  'John 17:3',
  'James 2:19',
  'Isa. 55:6-7', 'Isaiah 55:6-7', 'Isa. 55:6–7', 'Isaiah 55:6–7',
  'Eph. 2:10', 'Ephesians 2:10',
  'Matt. 7:21', 'Matthew 7:21',
  'Luke 18:13-14', 'Luke 18:13–14',
  'Rom. 11:33-36', 'Romans 11:33-36', 'Rom. 11:33–36', 'Romans 11:33–36',
  '2 Cor. 7:9-11', '2 Corinthians 7:9-11', '2 Cor. 7:9–11', '2 Corinthians 7:9–11',
  '1 Thess. 1:9', '1 Thessalonians 1:9',
  '2 Cor. 5:15', '2 Corinthians 5:15',
  'Rom. 12:1-2', 'Romans 12:1-2', 'Rom. 12:1–2', 'Romans 12:1–2',
  '1 Thess. 4:3-8', '1 Thessalonians 4:3-8', '1 Thess. 4:3–8', '1 Thessalonians 4:3–8',
  'Col. 3:23-25', 'Colossians 3:23-25', 'Col. 3:23–25', 'Colossians 3:23–25',
  'Matt. 6:33', 'Matthew 6:33',
  'Heb. 10:24-25', 'Hebrews 10:24-25', 'Heb. 10:24–25', 'Hebrews 10:24–25',
  'John 14:21',
  'Rom. 12:9-13', 'Romans 12:9-13', 'Rom. 12:9–13', 'Romans 12:9–13',
  '2 Cor. 5', '2 Corinthians 5',
  '2 Cor. 5:17', '2 Corinthians 5:17',
  '2 Cor. 5:17-18', '2 Corinthians 5:17-18', '2 Cor. 5:17–18', '2 Corinthians 5:17–18',
  '1 Peter 2:24-25', '1 Pet. 2:24-25', '1 Peter 2:24–25', '1 Pet. 2:24–25',
  'Ps. 23', 'Psalm 23',
  '2 Cor. 5:18', '2 Corinthians 5:18',
  '2 Cor. 5:20', '2 Corinthians 5:20',
  'John 14:1-3', 'John 14:1–3',
  'John 3:36',
  'John 14:6',
  'Prov. 13:15', 'Proverbs 13:15',
  'John 10:10',
  'Rev. 20:12-15', 'Revelation 20:12-15', 'Rev. 20:12–15', 'Revelation 20:12–15',
  'Rev. 21:8', 'Revelation 21:8'
];

// Function to normalize scripture references for comparison
function normalizeReference(ref) {
  return ref
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/–/g, '-')
    .replace(/—/g, '-')
    .replace(/:/g, ':')
    .replace(/;/g, ';')
    .trim();
}

// Function to check if a scripture reference should be marked as favorite
function shouldMarkAsFavorite(reference) {
  const normalizedRef = normalizeReference(reference);
  
  return boldedScriptures.some(boldRef => {
    const normalizedBold = normalizeReference(boldRef);
    
    // Direct match
    if (normalizedRef === normalizedBold) {
      return true;
    }
    
    // Check if the reference contains the bolded reference
    if (normalizedRef.includes(normalizedBold) || normalizedBold.includes(normalizedRef)) {
      return true;
    }
    
    return false;
  });
}

// Function to update the gospel presentation data
function updateGospelPresentationData() {
  const dataPath = path.join(__dirname, '../data/gospel-presentation.json');
  
  try {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    let updatedCount = 0;
    
    // Process each section
    data.forEach((section, sectionIndex) => {
      if (section.subsections) {
        section.subsections.forEach((subsection, subsectionIndex) => {
          // Process scripture references in subsections
          if (subsection.scriptureReferences) {
            subsection.scriptureReferences.forEach((scriptureRef, refIndex) => {
              if (shouldMarkAsFavorite(scriptureRef.reference)) {
                scriptureRef.favorite = true;
                updatedCount++;
                console.log(`Marked as favorite: ${scriptureRef.reference}`);
              }
            });
          }
          
          // Process nested subsections if they exist
          if (subsection.nestedSubsections) {
            subsection.nestedSubsections.forEach((nested, nestedIndex) => {
              if (nested.scriptureReferences) {
                nested.scriptureReferences.forEach((scriptureRef, refIndex) => {
                  if (shouldMarkAsFavorite(scriptureRef.reference)) {
                    scriptureRef.favorite = true;
                    updatedCount++;
                    console.log(`Marked as favorite (nested): ${scriptureRef.reference}`);
                  }
                });
              }
            });
          }
        });
      }
    });
    
    // Write the updated data back to the file
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`\nCompleted! Marked ${updatedCount} scripture references as favorites.`);
    
    return data;
  } catch (error) {
    console.error('Error updating gospel presentation data:', error);
    throw error;
  }
}

// Run the update if this file is executed directly
if (require.main === module) {
  updateGospelPresentationData();
}

module.exports = { updateGospelPresentationData, shouldMarkAsFavorite, normalizeReference };