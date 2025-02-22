declare namespace JSX {
  interface IntrinsicElements {
    'l-ring': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      size?: string | number
      stroke?: string | number
      'bg-opacity'?: string | number
      speed?: string | number
      color?: string
    }
  }
} 