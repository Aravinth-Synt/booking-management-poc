interface Step {
  number: number;
  label: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export default function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center w-full max-w-md mx-auto">
      {steps.map((step, i) => {
        const isComplete = currentStep > step.number;
        const isActive = currentStep === step.number;

        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
                  isComplete
                    ? 'bg-primary-500 border-primary-500 text-white'
                    : isActive
                    ? 'bg-white border-primary-500 text-primary-600'
                    : 'bg-white border-sand-200 text-sand-400'
                }`}
              >
                {isComplete ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  isActive ? 'text-primary-600' : isComplete ? 'text-primary-500' : 'text-sand-400'
                }`}
              >
                {step.label}
              </span>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`step-connector mx-2 mb-4 ${isComplete ? 'active' : ''}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
