import { BASICS_ANSWERS } from './basics';
import { DIALYSIS_ANSWERS } from './dialysis';
import { TRANSPLANT_ANSWERS } from './transplant';
import { DIET_ANSWERS } from './diet';
import { MEDICATIONS_ANSWERS } from './medications';
import { DIABETES_ANSWERS } from './diabetes';
import { TESTS_ANSWERS } from './tests';
import { PROCEDURES_ANSWERS } from './procedures';
import DYNAMIC_ANSWERS from './dynamic.json';

export const GOLD_ANSWERS: Record<string, string> = {
    ...BASICS_ANSWERS,
    ...DIALYSIS_ANSWERS,
    ...TRANSPLANT_ANSWERS,
    ...DIET_ANSWERS,
    ...MEDICATIONS_ANSWERS,
    ...DIABETES_ANSWERS,
    ...TESTS_ANSWERS,
    ...PROCEDURES_ANSWERS,
    ...DYNAMIC_ANSWERS as Record<string, string>
};
