test('trace module loads for react & react-dom when importing admin page', () => {
  const Module = require('module')
  const origLoad = Module._load
  const loads: Array<{ req: string, parent: string }>=[]
  Module._load = function(request: string, parent: any, isMain: boolean) {
    if (request === 'react' || request === 'react-dom' || request.includes('react')) {
      try {
        loads.push({ req: request, parent: parent && parent.filename })
        // eslint-disable-next-line no-console
        console.log('Module._load called for', request, 'parent=', parent && parent.filename)
      } catch (e) {
        // ignore
      }
    }
    return origLoad.apply(this, arguments)
  }

  // eslint-disable-next-line global-require
  jest.isolateModules(() => { require('../page') })

  // restore
  Module._load = origLoad

  // dump collected
  // eslint-disable-next-line no-console
  console.log('loads:', JSON.stringify(loads, null, 2))
})
