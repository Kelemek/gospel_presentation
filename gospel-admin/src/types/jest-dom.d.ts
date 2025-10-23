/// <reference types="@testing-library/jest-dom" />

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveValue(value: string | string[] | number | undefined): R
      toBeDisabled(): R
      toHaveAttribute(attr: string, value?: string): R
      toBeVisible(): R
      toBeChecked(): R
    }
  }
}

export {}