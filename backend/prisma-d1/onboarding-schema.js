export function onboardingSchema(schema){
 return schema.replace('model UserProfile {','model UserProfile {\n  firstName String?\n  lastName String?')
}
