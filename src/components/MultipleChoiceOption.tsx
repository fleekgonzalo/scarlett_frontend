'use client'

import { cn } from "@/lib/utils"

interface MultipleChoiceOptionProps {
  id: string
  label: string
  selected: boolean
  correct: boolean | null
  disabled: boolean
  onSelect: () => void
}

export function MultipleChoiceOption({
  id,
  label,
  selected,
  correct,
  disabled,
  onSelect
}: MultipleChoiceOptionProps) {
  // Determine the background color based on selection and correctness
  const getBackgroundColor = () => {
    if (!selected) return "bg-neutral-700 hover:bg-neutral-600"
    if (correct === null) return "bg-blue-600" // Just selected, not validated yet
    if (correct) return "bg-green-600" // Correct answer
    return "bg-red-600" // Incorrect answer
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "w-full p-4 rounded-lg text-left transition-colors",
        getBackgroundColor(),
        selected ? "text-white" : "text-white",
        disabled && !selected ? "opacity-70 hover:bg-neutral-700" : "",
        "flex items-center gap-3"
      )}
    >
      <div className="flex-shrink-0">
        <div className={cn(
          "w-5 h-5 rounded-full border-2",
          !selected ? "border-white" : "",
          selected && correct === null ? "bg-white border-white" : "",
          selected && correct === true ? "bg-white border-white" : "",
          selected && correct === false ? "bg-white border-white" : ""
        )} />
      </div>
      <span className="text-base">{label}</span>
    </button>
  )
} 