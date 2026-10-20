import './form-stepper.css';

interface FormStepperProps {
  steps: string[];
  activeStep: number;
  onStepClick?: (index: number) => void;
}

export default function FormStepper({ steps, activeStep, onStepClick }: FormStepperProps) {
  return (
    <div className="form-stepper">
      {steps.map((label, idx) => {
        const cls = [
          'form-stepper__step',
          idx === activeStep ? 'form-stepper__step--active' : '',
          idx < activeStep ? 'form-stepper__step--completed' : '',
          idx === 0 ? 'form-stepper__step--first' : '',
        ].filter(Boolean).join(' ');
        return (
          <div
            key={label}
            className={cls}
            onClick={() => onStepClick?.(idx)}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
