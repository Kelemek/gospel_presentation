import { ImageResponse } from 'next/og'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'
 
// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(45deg, #1a1a1a 0%, #2d2d2d 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: '3px',
          border: '1px solid #333',
        }}
      >
        {/* Bible book shape */}
        <div
          style={{
            position: 'relative',
            width: '24px',
            height: '20px',
            background: '#1a1a1a',
            borderRadius: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Cross */}
          <div
            style={{
              position: 'absolute',
              width: '2px',
              height: '10px',
              background: '#d4af37',
              left: '11px',
              top: '5px',
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '8px',
              height: '2px',
              background: '#d4af37',
              left: '8px',
              top: '9px',
            }}
          />
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}