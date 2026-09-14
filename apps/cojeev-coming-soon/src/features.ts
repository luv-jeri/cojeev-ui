export const features = [
 {id:"memory",label:"Shared memory",icon:"brain",tone:"olive",shape:"clover-soft",headline:"Remember, together.",copy:"Team context and decisions, remembered across every session."},
 {id:"harnesses",label:"Any harness",icon:"network",tone:"blue",shape:"cushion",headline:"Every harness. One system.",copy:"One operating system for all your coding AI harnesses."},
 {id:"hooks",label:"Prompt lifecycle",icon:"workflow",tone:"pink",shape:"seed-wing",headline:"Your prompt. Your rules.",copy:"Custom hooks and prompt injection. Before, during, and after every response."},
 {id:"identity",label:"One identity",icon:"user",tone:"yellow",shape:"sunburst-24",headline:"Still you. Everywhere.",copy:"One identity and your preferences, whichever agent you choose."},
 {id:"subagents",label:"Smart subagents",icon:"git-branch",tone:"blue",shape:"petal-7",headline:"The right mind for the task.",copy:"Automatic subagents, with the right model for each task."},
] as const;
export type FeatureId = typeof features[number]["id"];
