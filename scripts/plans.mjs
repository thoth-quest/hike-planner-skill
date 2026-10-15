#!/usr/bin/env node
// Optional helper to create a new plan. No build, server, or dependencies.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const folder = path.join(root, "site", "plans");
const indexPath = path.join(folder, "index.json");
const [cmd,slug,title] = process.argv.slice(2);
const valid = s => typeof s === "string" && /^[a-z0-9][a-z0-9-]{0,62}$/.test(s);
function readIndex() { return JSON.parse(readFileSync(indexPath, "utf8")); }
function save(file,value) { writeFileSync(file, JSON.stringify(value,null,2) + "\n", "utf8"); }
if(cmd === "list"){
  for(const id of readIndex().plans) console.log(id);
} else if(cmd === "add") {
  if(!valid(slug)){ console.error("Use a lowercase slug: letters, numbers, hyphen (max 63 chars)."); process.exitCode=1; }
  else {
    const destination = path.join(folder,slug);
    const output = path.join(destination,"activity.json");
    const registry = readIndex();
    if(existsSync(output) || registry.plans.includes(slug)) { console.error("Plan already exists: "+slug);process.exitCode=1; }
    else {
      mkdirSync(destination,{recursive:true});
      const plan={
        id:slug,schema_version:1,revision:1,stage:"goal_definition",status:"draft",
        title:title||slug,destination:{state:"undecided",name:null,source:null},
        goals:{primary:null,secondary:[]},
        constraints:{date:null,date_range:null,departure_area:null,difficulty:null,estimated_participants:null,latest_return:null,hard_rules:[]},
        weather:{status:"pending",snapshots:[],assessment:{level:"unknown",recommendation:null,reason:"尚未进行天气核查"}},
        candidates:[],evidence:[],changes:[]
      };
      save(output,plan);
      registry.plans.push(slug);
      save(indexPath,registry);
      console.log("Created "+output);
      console.log("Preview: plan.html?id="+slug);
      console.log("Review before committing: files in site/plans/ are PUBLIC on GitHub Pages.");
    }
  }
} else {
  console.log("Usage:\n  node scripts/plans.mjs list\n  node scripts/plans.mjs add <slug> [title]");
  if(cmd)process.exitCode=1;
}
