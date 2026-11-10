/* Satisfactory production planner.
 *
 * Lifted from the old single-file App.jsx with its logic untouched — the recipe
 * graph, the foundation-footprint layout, and the drag/pan/zoom canvas are all
 * as they were. Only the page chrome was removed: nav, heading and footer now
 * come from the Astro page that mounts this.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';

// Importing the full planner inline to keep it as a single-file app

const F = 28;
const MACHINE_FP = {
  Smelter: { w: 2, l: 2 }, Constructor: { w: 2, l: 2 },
  Foundry: { w: 2, l: 3 }, Assembler: { w: 2, l: 3 },
  Manufacturer: { w: 3, l: 4 }, Refinery: { w: 3, l: 4 },
  Blender: { w: 3, l: 4 }, "Particle Accelerator": { w: 5, l: 5 },
};

const ALL_RECIPES = {
  // ── Raw resources ──
  "Iron Ore":          { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Copper Ore":        { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Limestone":         { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Coal":              { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Caterium Ore":      { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Raw Quartz":        { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Sulfur":            { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Bauxite":           { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Crude Oil":         { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Water":             { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Nitrogen Gas":      { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Uranium":           { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  // Byproducts treated as raw inputs
  "Petroleum Coke":            { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Heavy Oil Residue":         { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Compacted Coal":            { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Sulfuric Acid":             { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Fuel":                      { default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },
  "Electromagnetic Control Rod":{ default: { machine: null, raw: true, rate: 0, time: 0, inputs: [], output: 1, power: 0 } },

  // ── Ingots ──
  "Iron Ingot": {
    default:             { machine: "Smelter",  raw: false, time: 2,  inputs: [["Iron Ore",1]],                      output: 1,  rate: 30,  power: 4  },
    "Pure Iron":         { machine: "Refinery", raw: false, time: 12, inputs: [["Iron Ore",7],["Water",4]],           output: 13, rate: 65,  power: 30, tier: "S" },
    "Basic Iron Ingot":  { machine: "Foundry",  raw: false, time: 12, inputs: [["Iron Ore",5],["Limestone",8]],      output: 10, rate: 50,  power: 16 },
    "Iron Alloy Ingot":  { machine: "Foundry",  raw: false, time: 12, inputs: [["Iron Ore",8],["Copper Ore",2]],     output: 15, rate: 75,  power: 16 },
    "Leached Iron Ingot":{ machine: "Refinery", raw: false, time: 6,  inputs: [["Iron Ore",5],["Sulfuric Acid",1]], output: 10, rate: 100, power: 30, tier: "S" },
  },
  "Copper Ingot": {
    default:                 { machine: "Smelter",  raw: false, time: 2,  inputs: [["Copper Ore",1]],                              output: 1,  rate: 30,  power: 4  },
    "Pure Copper":           { machine: "Refinery", raw: false, time: 24, inputs: [["Copper Ore",6],["Water",4]],                  output: 15, rate: 37.5,power: 30, tier: "S" },
    "Copper Alloy Ingot":    { machine: "Foundry",  raw: false, time: 6,  inputs: [["Copper Ore",5],["Iron Ore",5]],               output: 10, rate: 100, power: 16, tier: "A" },
    "Tempered Copper Ingot": { machine: "Foundry",  raw: false, time: 12, inputs: [["Copper Ore",5],["Petroleum Coke",8]],         output: 12, rate: 60,  power: 16 },
    "Leached Copper Ingot":  { machine: "Refinery", raw: false, time: 12, inputs: [["Copper Ore",9],["Sulfuric Acid",5]],          output: 22, rate: 110, power: 30, tier: "S" },
  },
  "Caterium Ingot": {
    default:                   { machine: "Smelter",  raw: false, time: 4,  inputs: [["Caterium Ore",3]],                          output: 1, rate: 15,   power: 4  },
    "Pure Caterium Ingot":     { machine: "Refinery", raw: false, time: 5,  inputs: [["Caterium Ore",2],["Water",2]],              output: 1, rate: 12,   power: 30, tier: "S" },
    "Tempered Caterium Ingot": { machine: "Foundry",  raw: false, time: 8,  inputs: [["Caterium Ore",6],["Petroleum Coke",2]],     output: 3, rate: 22.5, power: 16 },
    "Leached Caterium Ingot":  { machine: "Refinery", raw: false, time: 10, inputs: [["Caterium Ore",9],["Sulfuric Acid",5]],      output: 6, rate: 36,   power: 30, tier: "A" },
  },
  "Steel Ingot": {
    default:                { machine: "Foundry", raw: false, time: 4,  inputs: [["Iron Ore",3],["Coal",3]],                  output: 3,  rate: 45,  power: 16 },
    "Solid Steel":          { machine: "Foundry", raw: false, time: 3,  inputs: [["Iron Ingot",2],["Coal",2]],                output: 3,  rate: 60,  power: 16, tier: "S" },
    "Coke Steel Ingot":     { machine: "Foundry", raw: false, time: 12, inputs: [["Iron Ore",15],["Petroleum Coke",15]],      output: 20, rate: 100, power: 16 },
    "Compacted Steel Ingot":{ machine: "Foundry", raw: false, time: 24, inputs: [["Iron Ore",2],["Compacted Coal",1]],        output: 4,  rate: 10,  power: 16 },
  },

  // ── Basic parts ──
  "Iron Plate": {
    default:            { machine: "Constructor", raw: false, time: 6, inputs: [["Iron Ingot",3]],                  output: 2,  rate: 20, power: 4  },
    "Coated Iron Plate":{ machine: "Assembler",  raw: false, time: 8, inputs: [["Iron Ingot",5],["Plastic",1]],     output: 10, rate: 75, power: 15, tier: "A" },
    "Steel Cast Plate": { machine: "Foundry",    raw: false, time: 4, inputs: [["Iron Ingot",1],["Steel Ingot",1]], output: 3,  rate: 45, power: 16 },
  },
  "Iron Rod": {
    default:    { machine: "Constructor", raw: false, time: 4, inputs: [["Iron Ingot",1]],  output: 1, rate: 15, power: 4 },
    "Steel Rod":{ machine: "Constructor", raw: false, time: 5, inputs: [["Steel Ingot",1]], output: 4, rate: 48, power: 4, tier: "A" },
  },
  "Wire": {
    default:        { machine: "Constructor", raw: false, time: 4,  inputs: [["Copper Ingot",1]],                       output: 2,  rate: 30,  power: 4  },
    "Iron Wire":    { machine: "Constructor", raw: false, time: 24, inputs: [["Iron Ingot",5]],                         output: 9,  rate: 22.5,power: 4  },
    "Caterium Wire":{ machine: "Constructor", raw: false, time: 4,  inputs: [["Caterium Ingot",1]],                     output: 8,  rate: 120, power: 4,  tier: "S" },
    "Fused Wire":   { machine: "Assembler",   raw: false, time: 20, inputs: [["Copper Ingot",4],["Caterium Ingot",1]], output: 30, rate: 90,  power: 15, tier: "A" },
  },
  "Cable": {
    default:           { machine: "Constructor", raw: false, time: 2,  inputs: [["Wire",2]],                              output: 1,  rate: 30,   power: 4  },
    "Coated Cable":    { machine: "Refinery",    raw: false, time: 8,  inputs: [["Wire",5],["Heavy Oil Residue",2]],      output: 9,  rate: 67.5, power: 30, tier: "S" },
    "Insulated Cable": { machine: "Assembler",   raw: false, time: 12, inputs: [["Wire",9],["Rubber",6]],                 output: 20, rate: 100,  power: 15, tier: "A" },
    "Quickwire Cable": { machine: "Assembler",   raw: false, time: 24, inputs: [["Quickwire",3],["Rubber",2]],            output: 11, rate: 27.5, power: 15 },
  },
  "Concrete": {
    default:           { machine: "Constructor", raw: false, time: 4,  inputs: [["Limestone",3]],                     output: 1, rate: 15, power: 4  },
    "Fine Concrete":   { machine: "Assembler",   raw: false, time: 12, inputs: [["Silica",3],["Limestone",12]],       output: 10,rate: 50, power: 15 },
    "Rubber Concrete": { machine: "Assembler",   raw: false, time: 6,  inputs: [["Limestone",10],["Rubber",2]],       output: 9, rate: 90, power: 15 },
    "Wet Concrete":    { machine: "Refinery",    raw: false, time: 3,  inputs: [["Limestone",6],["Water",5]],         output: 4, rate: 80, power: 30 },
  },
  "Screw": {
    default:       { machine: "Constructor", raw: false, time: 6,  inputs: [["Iron Rod",1]],   output: 4,  rate: 40,  power: 4 },
    "Cast Screws": { machine: "Constructor", raw: false, time: 24, inputs: [["Iron Ingot",5]], output: 20, rate: 50,  power: 4 },
    "Steel Screw": { machine: "Constructor", raw: false, time: 12, inputs: [["Steel Beam",1]], output: 52, rate: 260, power: 4, tier: "S" },
  },
  "Copper Sheet": {
    default:                 { machine: "Constructor", raw: false, time: 6, inputs: [["Copper Ingot",2]],              output: 1, rate: 10,   power: 4  },
    "Steamed Copper Sheet":  { machine: "Refinery",    raw: false, time: 8, inputs: [["Copper Ingot",3],["Water",3]], output: 3, rate: 22.5, power: 30 },
  },
  "Silica": {
    default:       { machine: "Constructor", raw: false, time: 8, inputs: [["Raw Quartz",3]],                   output: 5, rate: 37.5, power: 4  },
    "Cheap Silica":{ machine: "Assembler",  raw: false, time: 8, inputs: [["Raw Quartz",3],["Limestone",5]],    output: 7, rate: 52.5, power: 15 },
  },
  "Rubber": {
    default:          { machine: "Refinery", raw: false, time: 6,  inputs: [["Crude Oil",3]],           output: 2,  rate: 20, power: 30 },
    "Recycled Rubber":{ machine: "Refinery", raw: false, time: 12, inputs: [["Plastic",6],["Fuel",6]],  output: 12, rate: 60, power: 30 },
  },
  "Quartz Crystal": {
    default:              { machine: "Constructor", raw: false, time: 8,  inputs: [["Raw Quartz",5]],                    output: 3,  rate: 22.5, power: 4  },
    "Fused Quartz Crystal":{ machine: "Foundry",   raw: false, time: 20, inputs: [["Raw Quartz",25],["Coal",12]],        output: 18, rate: 54,   power: 16 },
    "Pure Quartz Crystal": { machine: "Refinery",  raw: false, time: 8,  inputs: [["Raw Quartz",9],["Water",5]],         output: 7,  rate: 52.5, power: 30, tier: "A" },
  },

  // ── Mid-tier parts ──
  "Reinforced Iron Plate": {
    default:              { machine: "Assembler", raw: false, time: 12, inputs: [["Iron Plate",6],["Screw",12]],    output: 1, rate: 5,     power: 15 },
    "Adhered Iron Plate": { machine: "Assembler", raw: false, time: 16, inputs: [["Iron Plate",3],["Rubber",1]],   output: 1, rate: 3.75,  power: 15 },
    "Bolted Iron Plate":  { machine: "Assembler", raw: false, time: 12, inputs: [["Iron Plate",18],["Screw",50]], output: 3, rate: 15,    power: 15, tier: "A" },
    "Stitched Iron Plate":{ machine: "Assembler", raw: false, time: 32, inputs: [["Iron Plate",10],["Wire",20]],   output: 3, rate: 5.625, power: 15 },
  },
  "Rotor": {
    default:        { machine: "Assembler", raw: false, time: 15, inputs: [["Iron Rod",5],["Screw",25]],        output: 1, rate: 4,     power: 15 },
    "Copper Rotor": { machine: "Assembler", raw: false, time: 16, inputs: [["Copper Sheet",6],["Screw",52]],    output: 3, rate: 11.25, power: 15, tier: "A" },
    "Steel Rotor":  { machine: "Assembler", raw: false, time: 12, inputs: [["Steel Pipe",2],["Wire",6]],        output: 1, rate: 5,     power: 15, tier: "S" },
  },
  "Modular Frame": {
    default:        { machine: "Assembler", raw: false, time: 60, inputs: [["Reinforced Iron Plate",3],["Iron Rod",12]],     output: 2, rate: 2, power: 15 },
    "Bolted Frame": { machine: "Assembler", raw: false, time: 24, inputs: [["Reinforced Iron Plate",3],["Screw",56]],        output: 2, rate: 5, power: 15, tier: "A" },
    "Steeled Frame":{ machine: "Assembler", raw: false, time: 60, inputs: [["Reinforced Iron Plate",2],["Steel Pipe",10]],   output: 3, rate: 3, power: 15 },
  },
  "Smart Plating": {
    default:                { machine: "Assembler",     raw: false, time: 30, inputs: [["Reinforced Iron Plate",1],["Rotor",1]],                output: 1, rate: 2, power: 15 },
    "Plastic Smart Plating":{ machine: "Manufacturer",  raw: false, time: 24, inputs: [["Reinforced Iron Plate",1],["Rotor",1],["Plastic",3]], output: 2, rate: 5, power: 55 },
  },
  "Steel Beam": {
    default:      { machine: "Constructor", raw: false, time: 4,  inputs: [["Steel Ingot",4]],                  output: 1, rate: 15, power: 4  },
    "Molded Beam":{ machine: "Foundry",    raw: false, time: 12, inputs: [["Steel Ingot",24],["Concrete",16]], output: 9, rate: 45, power: 16, tier: "A" },
  },
  "Steel Pipe": {
    default:            { machine: "Constructor", raw: false, time: 6,  inputs: [["Steel Ingot",3]],                  output: 2, rate: 20, power: 4  },
    "Iron Pipe":        { machine: "Constructor", raw: false, time: 12, inputs: [["Iron Ingot",20]],                  output: 5, rate: 25, power: 4  },
    "Molded Steel Pipe":{ machine: "Foundry",    raw: false, time: 6,  inputs: [["Steel Ingot",5],["Concrete",3]],   output: 5, rate: 50, power: 16, tier: "A" },
  },
  "Encased Industrial Beam": {
    default:                   { machine: "Assembler", raw: false, time: 10, inputs: [["Steel Beam",3],["Concrete",6]], output: 1, rate: 6, power: 15 },
    "Encased Industrial Pipe": { machine: "Assembler", raw: false, time: 15, inputs: [["Steel Pipe",6],["Concrete",5]], output: 1, rate: 4, power: 15 },
  },
  "Stator": {
    default:           { machine: "Assembler", raw: false, time: 12, inputs: [["Steel Pipe",3],["Wire",8]],      output: 1, rate: 5, power: 15 },
    "Quickwire Stator":{ machine: "Assembler", raw: false, time: 15, inputs: [["Steel Pipe",4],["Quickwire",15]],output: 2, rate: 8, power: 15 },
  },
  "Motor": {
    default:        { machine: "Assembler",    raw: false, time: 12, inputs: [["Rotor",2],["Stator",2]],                                            output: 1, rate: 5,   power: 15 },
    "Electric Motor":{ machine: "Assembler",  raw: false, time: 16, inputs: [["Electromagnetic Control Rod",1],["Rotor",2]],                       output: 2, rate: 7.5, power: 15 },
    "Rigor Motor":  { machine: "Manufacturer", raw: false, time: 48, inputs: [["Rotor",3],["Stator",3],["Crystal Oscillator",1]],                  output: 6, rate: 7.5, power: 55, tier: "A" },
  },
  "Crystal Oscillator": {
    default:                       { machine: "Manufacturer", raw: false, time: 120, inputs: [["Quartz Crystal",36],["Cable",28],["Reinforced Iron Plate",5]], output: 2, rate: 1,     power: 55 },
    "Insulated Crystal Oscillator":{ machine: "Manufacturer", raw: false, time: 32,  inputs: [["Quartz Crystal",10],["Rubber",7],["AI Limiter",1]],            output: 1, rate: 1.875, power: 55 },
  },
  "Quickwire": {
    default:          { machine: "Constructor", raw: false, time: 5, inputs: [["Caterium Ingot",1]],                       output: 5,  rate: 60, power: 4  },
    "Fused Quickwire":{ machine: "Assembler",  raw: false, time: 8, inputs: [["Caterium Ingot",1],["Copper Ingot",5]],     output: 12, rate: 90, power: 15, tier: "A" },
  },

  // ── Advanced parts ──
  "Plastic": {
    default:           { machine: "Refinery", raw: false, time: 6,  inputs: [["Crude Oil",3]],          output: 2,  rate: 20, power: 30 },
    "Recycled Plastic":{ machine: "Refinery", raw: false, time: 12, inputs: [["Rubber",6],["Fuel",6]],  output: 12, rate: 60, power: 30 },
  },
  "Circuit Board": {
    default:                  { machine: "Assembler", raw: false, time: 8,  inputs: [["Copper Sheet",2],["Plastic",4]],          output: 1, rate: 7.5,  power: 15 },
    "Caterium Circuit Board": { machine: "Assembler", raw: false, time: 48, inputs: [["Plastic",10],["Quickwire",30]],           output: 7, rate: 8.75, power: 15, tier: "A" },
    "Electrode Circuit Board":{ machine: "Assembler", raw: false, time: 12, inputs: [["Rubber",4],["Petroleum Coke",8]],         output: 1, rate: 5,    power: 15 },
    "Silicon Circuit Board":  { machine: "Assembler", raw: false, time: 24, inputs: [["Copper Sheet",11],["Silica",11]],         output: 5, rate: 12.5, power: 15 },
  },
  "AI Limiter": {
    default:              { machine: "Assembler", raw: false, time: 12, inputs: [["Copper Sheet",5],["Quickwire",20]], output: 1, rate: 5, power: 15 },
    "Plastic AI Limiter": { machine: "Assembler", raw: false, time: 15, inputs: [["Quickwire",30],["Plastic",7]],     output: 2, rate: 8, power: 15 },
  },
  "Computer": {
    default:             { machine: "Manufacturer", raw: false, time: 24, inputs: [["Circuit Board",4],["Cable",8],["Plastic",16]], output: 1, rate: 2.5,  power: 55 },
    "Caterium Computer": { machine: "Manufacturer", raw: false, time: 16, inputs: [["Circuit Board",4],["Quickwire",14],["Rubber",6]],            output: 1, rate: 3.75,      power: 55 },
    "Crystal Computer":  { machine: "Assembler",    raw: false, time: 36, inputs: [["Circuit Board",3],["Crystal Oscillator",1]],                output: 2, rate: 3.333333, power: 15 },
  },
  "Heavy Modular Frame": {
    default:                { machine: "Manufacturer", raw: false, time: 30, inputs: [["Modular Frame",5],["Steel Pipe",20],["Encased Industrial Beam",5],["Screw",120]],        output: 1, rate: 2,      power: 55 },
    "Heavy Encased Frame":  { machine: "Manufacturer", raw: false, time: 64, inputs: [["Modular Frame",8],["Encased Industrial Beam",10],["Steel Pipe",36],["Concrete",22]],     output: 3, rate: 2.8125,power: 55 },
    "Heavy Flexible Frame": { machine: "Manufacturer", raw: false, time: 16, inputs: [["Modular Frame",5],["Encased Industrial Beam",3],["Rubber",20],["Screw",104]],           output: 1, rate: 3.75,  power: 55 },
  },

  // ── High-tier intermediates ──
  "High-Speed Connector": {
    default: { machine: "Manufacturer", raw: false, time: 16, inputs: [["Quickwire",56],["Cable",10],["Circuit Board",1]], output: 1, rate: 3.75, power: 55 },
  },
  "Supercomputer": {
    default: { machine: "Manufacturer", raw: false, time: 32, inputs: [["Computer",4],["AI Limiter",2],["High-Speed Connector",3],["Plastic",28]], output: 1, rate: 1.875, power: 55 },
  },

  // ── Space Elevator parts ──
  "Versatile Framework": {
    default: { machine: "Assembler", raw: false, time: 24, inputs: [["Modular Frame",1],["Steel Beam",12]], output: 2, rate: 5, power: 15 },
  },
  "Automated Wiring": {
    default: { machine: "Assembler", raw: false, time: 24, inputs: [["Stator",1],["Cable",20]], output: 1, rate: 2.5, power: 15 },
  },
  "Modular Engine": {
    default: { machine: "Manufacturer", raw: false, time: 60, inputs: [["Motor",2],["Rubber",15],["Smart Plating",2]], output: 1, rate: 1, power: 55 },
  },
  "Adaptive Control Unit": {
    default: { machine: "Manufacturer", raw: false, time: 60, inputs: [["Automated Wiring",5],["Circuit Board",5],["Heavy Modular Frame",1],["Computer",2]], output: 1, rate: 1, power: 55 },
  },
  "Magnetic Field Generator": {
    default: { machine: "Assembler", raw: false, time: 120, inputs: [["Versatile Framework",5],["Electromagnetic Control Rod",2]], output: 2, rate: 1, power: 15 },
  },
  "Assembly Director System": {
    default: { machine: "Assembler", raw: false, time: 80, inputs: [["Adaptive Control Unit",2],["Supercomputer",1]], output: 1, rate: 0.75, power: 15 },
  },
};

const getR = (it, ch) => ALL_RECIPES[it]?.[ch[it] || "default"] || ALL_RECIPES[it]?.default;
const getAlts = (it) => ALL_RECIPES[it] ? Object.keys(ALL_RECIPES[it]).filter(k => k !== "default") : [];
const MC = {
  Smelter: { fill: "#1a3a2a", stroke: "#2d7a50", text: "#5ec49a" },
  Constructor: { fill: "#162e42", stroke: "#2d6599", text: "#5aaddf" },
  Foundry: { fill: "#3d2e10", stroke: "#9a6520", text: "#daa040" },
  Assembler: { fill: "#2d1a50", stroke: "#6a40a0", text: "#a080d8" },
  Manufacturer: { fill: "#501a38", stroke: "#a04070", text: "#d880a8" },
  Refinery: { fill: "#133838", stroke: "#2d7878", text: "#50c8c8" },
  Blender: { fill: "#243812", stroke: "#608830", text: "#98d858" },
  "Particle Accelerator": { fill: "#401818", stroke: "#983838", text: "#d87070" },
  raw: { fill: "#141e28", stroke: "#3a5878", text: "#78b8d8" },
};
const TIER_COL = { S: "#fbbf24", A: "#68d391", B: "#63b3ed" };

let uid = 0;
function buildTree(item, rate, ch, sloop = new Set(), vis = new Set()) {
  const r = getR(item, ch); if (!r) return null;
  const id = item + "_" + (uid++);
  if (vis.has(item)) return { id, item, rate, machine: r.machine, mc: 0, pw: 0, ch: [], raw: r.raw };
  vis.add(item);
  if (r.raw) return { id, item, rate, machine: null, mc: 0, pw: 0, ch: [], raw: true };
  const sl = sloop.has(item), eRate = sl ? r.rate * 2 : r.rate;
  const mc = rate / eRate, pw = mc * r.power * (sl ? 2 : 1);
  const kids = r.inputs.map(([inp, qty]) => buildTree(inp, (qty / r.output) * (60 / r.time) * mc, ch, sloop, new Set(vis))).filter(Boolean);
  return { id, item, rate, machine: r.machine, mc, pw, ch: kids, raw: false, alt: ch[item] && ch[item] !== "default" ? ch[item] : null, hasAlts: getAlts(item).length > 0, sl };
}

function plannerLayout(root) {
  const flat = []; const walk = (n, d) => { flat.push({ ...n, d }); n.ch.forEach(c => walk(c, d + 1)); }; walk(root, 0);
  const byD = {}, MGAP = 8;
  flat.forEach(n => { (byD[n.d] = byD[n.d] || []).push(n); });
  const maxD = Math.max(...Object.keys(byD).map(Number)), gapX = 16, gapY = 28;
  const pos = {};
  const nodeSize = (n) => {
    if (n.raw) return { w: 80, h: 40 };
    const fp = MACHINE_FP[n.machine]; if (!fp) return { w: 100, h: 60 };
    const mc = Math.ceil(n.mc), perRow = Math.min(mc, 4), rows = Math.ceil(mc / perRow);
    return { w: Math.max(perRow * fp.w * F + (perRow - 1) * MGAP + 20, 100), h: Math.max(rows * fp.l * F + (rows - 1) * MGAP + 32, 60) };
  };
  const sizes = {}; flat.forEach(n => { sizes[n.id] = nodeSize(n); });
  // Compute y-offset per depth based on actual max node heights so rows never overlap
  const depthY = {}; let curY = 0;
  for (let d = 0; d <= maxD; d++) {
    depthY[d] = curY;
    const maxH = Math.max(...(byD[d] || []).map(n => sizes[n.id].h));
    curY += maxH + gapY;
  }
  for (let d = maxD; d >= 0; d--) {
    const nodes = byD[d] || [];
    nodes.forEach((n, i) => { const sz = sizes[n.id]; const cp = n.ch.map(c => pos[c.id]).filter(Boolean);
      let x = cp.length > 0 ? (Math.min(...cp.map(p => p.x)) + Math.max(...cp.map(p => p.x + p.w))) / 2 - sz.w / 2 : i * (sz.w + gapX);
      pos[n.id] = { ...n, x, y: depthY[d], ...sz }; });
    const sorted = nodes.map(n => pos[n.id]).sort((a, b) => a.x - b.x);
    for (let i = 1; i < sorted.length; i++) { if (sorted[i].x < sorted[i - 1].x + sorted[i - 1].w + gapX) { sorted[i].x = sorted[i - 1].x + sorted[i - 1].w + gapX; pos[sorted[i].id] = sorted[i]; } }
  }
  const all = Object.values(pos); const minX = Math.min(...all.map(p => p.x)); all.forEach(p => p.x -= minX);
  const edges = []; flat.forEach(n => { const from = pos[n.id]; n.ch.forEach(c => { const to = pos[c.id]; if (from && to) edges.push({ from, to, rate: c.rate }); }); });
  return { nodes: all, edges, W: Math.max(...all.map(p => p.x + p.w)) + 20, H: Math.max(...all.map(p => p.y + p.h)) + 20 };
}

function MNode({ n, sel, onSel, onDragStart, rotation }) {
  const c = n.raw ? MC.raw : (MC[n.machine] || MC.raw);
  const mc = Math.ceil(n.mc), MGAP = 8;
  const rot = rotation || 0;
  const fp = MACHINE_FP[n.machine];

  const cells = [];
  const manifoldLines = [];

  if (fp && !n.raw) {
    const perRow = Math.min(mc, 4), rows = Math.ceil(mc / perRow);
    const mW = fp.w * F, mH = fp.l * F;
    const gridW = perRow * mW + (perRow - 1) * MGAP;
    const ox = (n.w - gridW) / 2, oy = 26;

    for (let r = 0; r < rows; r++) {
      const inRow = r < rows - 1 ? perRow : mc - r * perRow;
      const rowX0 = ox;
      const rowX1 = ox + (inRow - 1) * (mW + MGAP) + mW;

      for (let m = 0; m < inRow; m++) {
        const mx0 = ox + m * (mW + MGAP), my0 = oy + r * (mH + MGAP);
        for (let fy = 0; fy < fp.l; fy++) for (let fx = 0; fx < fp.w; fx++)
          cells.push(<rect key={`${r}-${m}-${fx}-${fy}`} x={mx0+fx*F} y={my0+fy*F} width={F-2} height={F-2} rx={3} fill={c.fill} stroke={c.stroke} strokeWidth={0.7} />);
        cells.push(<rect key={`m-${r}-${m}`} x={mx0-1} y={my0-1} width={mW} height={mH} rx={3} fill="none" stroke={c.stroke} strokeWidth={1.2} opacity={0.9} />);
        cells.push(<text key={`l-${r}-${m}`} x={mx0+mW/2} y={my0+mH/2} textAnchor="middle" dominantBaseline="central" fill={c.text} fontSize={9} fontFamily="monospace" fontWeight={600} opacity={0.55}>{n.machine?.charAt(0)}</text>);
      }

      // Manifold belt lines when multiple machines in a row
      if (inRow > 1) {
        const beltTopY = oy + r * (mH + MGAP) - 5;
        const beltBotY = oy + r * (mH + MGAP) + mH + 1;
        manifoldLines.push(
          <g key={`belt-${r}`}>
            <rect x={rowX0} y={beltTopY} width={rowX1 - rowX0} height={4} rx={2} fill={c.stroke} opacity={0.55} />
            <rect x={rowX0} y={beltBotY} width={rowX1 - rowX0} height={4} rx={2} fill={c.stroke} opacity={0.35} />
            {Array.from({ length: inRow }, (_, m) => {
              const cx0 = ox + m * (mW + MGAP) + mW / 2;
              return <line key={`drop-${m}`} x1={cx0} y1={beltTopY + 4} x2={cx0} y2={oy + r * (mH + MGAP)} stroke={c.stroke} strokeWidth={1.5} strokeDasharray="2,2" opacity={0.5} />;
            })}
          </g>
        );
      }
    }
  }

  // Rotate cells grid around node center; labels stay horizontal
  const cx = n.w / 2, cy = n.h / 2;

  return (
    <g transform={`translate(${n.x},${n.y})${rot ? ` rotate(${rot},${cx},${cy})` : ""}`}
       onMouseDown={e => { e.stopPropagation(); onDragStart(e, n); }}
       onClick={e => { e.stopPropagation(); onSel(n); }}
       style={{ cursor: "grab" }}>
      <rect width={n.w} height={n.h} rx={6} fill="#0d1117" stroke={sel === n.id ? "#fbbf24" : c.stroke} strokeWidth={sel === n.id ? 2 : 1} opacity={0.95} />
      {manifoldLines}
      {cells}
      <text x={cx} y={12} textAnchor="middle" fill={c.text} fontSize={10} fontWeight={600} fontFamily="system-ui">{n.item.length > 20 ? n.item.slice(0,18)+".." : n.item}</text>
      {n.raw
        ? <text x={cx} y={n.h-6} textAnchor="middle" fill="#68d391" fontSize={9} fontFamily="monospace">{n.rate.toFixed(1)}/min</text>
        : <text x={cx} y={n.h-6} textAnchor="middle" fill="#a0aec0" fontSize={8} fontFamily="monospace">
            <tspan fill={c.text}>{n.rate.toFixed(1)}/m</tspan><tspan fill="#4a5568"> · </tspan><tspan fill="#fbbf24">x{mc}</tspan><tspan fill="#4a5568"> · </tspan><tspan fill="#fc8181">{n.pw.toFixed(0)}MW</tspan>
          </text>}
    </g>
  );
}

function PEdge({ e }) {
  const px = e.from.x + e.from.w / 2, py = e.from.y + e.from.h, cx = e.to.x + e.to.w / 2, cy = e.to.y;
  const c = e.to.raw ? MC.raw : (MC[e.to.machine] || MC.raw), midY = py + (cy - py) * 0.5;
  return <g><path d={Math.abs(px-cx)<3 ? `M${cx},${cy} L${px},${py}` : `M${cx},${cy} L${cx},${midY} L${px},${midY} L${px},${py}`}
    fill="none" stroke={c.stroke} strokeWidth={1.5} opacity={0.5} markerEnd="url(#a)" />
    <text x={(px+cx)/2} y={midY-3} textAnchor="middle" fill={c.stroke} fontSize={7} fontFamily="monospace" opacity={0.7}>{e.rate.toFixed(1)}</text></g>;
}

export default function SatisfactoryPlanner() {
  const [item, setItem] = useState("Motor");
  const [rate, setRate] = useState(5);
  const [ch, setCh] = useState({});
  const [search, setSearch] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [sel, setSel] = useState(null);
  const [pan, setPan] = useState({ x: 20, y: 20 });
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState(false);
  const [ds, setDs] = useState(null);
  const [nodePositions, setNodePositions] = useState({});
  const [nodeRotations, setNodeRotations] = useState({});
  const [draggingNode, setDraggingNode] = useState(null); // for cursor style only
  const draggingNodeRef = useRef(null);
  const dnOffsetRef = useRef(null);
  const dRef = useRef(null);
  const canvasRef = useRef(null);
  const dragMovedRef = useRef(false);
  const touchStateRef = useRef({});
  const panTouchRef = useRef(null);
  const touchGestureRef = useRef(null);

  const craftable = useMemo(() => Object.entries(ALL_RECIPES).filter(([, r]) => !r.default.raw).map(([n]) => n).sort(), []);
  const filt = useMemo(() => craftable.filter(i => i.toLowerCase().includes(search.toLowerCase())), [search, craftable]);
  const tree = useMemo(() => { uid = 0; return buildTree(item, rate, ch); }, [item, rate, ch]);
  const lo = useMemo(() => tree ? plannerLayout(tree) : null, [tree]);

  const mergedNodes = useMemo(() => {
    if (!lo) return [];
    return lo.nodes.map(n => nodePositions[n.id] ? { ...n, x: nodePositions[n.id].x, y: nodePositions[n.id].y } : n);
  }, [lo, nodePositions]);

  const mergedEdges = useMemo(() => {
    if (!lo || !mergedNodes.length) return [];
    const pm = {};
    mergedNodes.forEach(n => { pm[n.id] = n; });
    return lo.edges.map(e => ({ ...e, from: pm[e.from.id] ?? e.from, to: pm[e.to.id] ?? e.to }));
  }, [lo, mergedNodes]);

  const totals = useMemo(() => {
    if (!tree) return null;
    const raws = {}, mach = {};
    const w = n => { if (n.raw) raws[n.item] = (raws[n.item]||0)+n.rate; else { if (!mach[n.item]) mach[n.item]={m:0,p:0,machine:n.machine}; mach[n.item].m+=n.mc; mach[n.item].p+=n.pw; } n.ch.forEach(w); }; w(tree);
    let fnd=0; Object.values(mach).forEach(d => { const fp=MACHINE_FP[d.machine]; if(fp) fnd+=Math.ceil(d.m)*fp.w*fp.l; });
    return { raws, totalM: Object.values(mach).reduce((a,m)=>a+Math.ceil(m.m),0), totalP: Object.values(mach).reduce((a,m)=>a+m.p,0), fnd: Math.ceil(fnd*1.35) };
  }, [tree]);

  useEffect(() => { const h = e => { if (dRef.current && !dRef.current.contains(e.target)) setShowDrop(false); }; document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h); }, []);

  // Prevent iOS Safari from stealing touches (swipe-back gesture causing blank screen)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const prevent = e => e.preventDefault();
    el.addEventListener('touchstart', prevent, { passive: false });
    el.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      el.removeEventListener('touchstart', prevent);
      el.removeEventListener('touchmove', prevent);
    };
  }, []);

  // ── Touch helpers (React synthetic events, touchAction:none handles scroll prevention) ──
  const getCanvasPos = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, [pan, zoom]);

  const hitTestNode = useCallback((x, y) => {
    return mergedNodes.find(n => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) || null;
  }, [mergedNodes]);

  const handleTouchStart = useCallback(e => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const pos = getCanvasPos(t.clientX, t.clientY);
      const node = hitTestNode(pos.x, pos.y);
      dragMovedRef.current = false;
      if (node) {
        const nx = nodePositions[node.id]?.x ?? node.x;
        const ny = nodePositions[node.id]?.y ?? node.y;
        draggingNodeRef.current = node.id;
        dnOffsetRef.current = { x: pos.x - nx, y: pos.y - ny };
        setDraggingNode(node.id);
        touchGestureRef.current = { type: 'node' };
      } else {
        panTouchRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
        touchGestureRef.current = { type: 'pan' };
      }
    } else if (e.touches.length === 2) {
      draggingNodeRef.current = null; dnOffsetRef.current = null; panTouchRef.current = null;
      setDraggingNode(null);
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchGestureRef.current = { type: 'pinch', startDist: Math.hypot(dx, dy), startZoom: zoom };
    }
  }, [getCanvasPos, hitTestNode, nodePositions, pan, zoom]);

  const handleTouchMove = useCallback(e => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const nodeId = draggingNodeRef.current;
      const offset = dnOffsetRef.current;
      if (nodeId && offset) {
        dragMovedRef.current = true;
        const pos = getCanvasPos(t.clientX, t.clientY);
        setNodePositions(prev => ({ ...prev, [nodeId]: { x: pos.x - offset.x, y: pos.y - offset.y } }));
      } else if (panTouchRef.current) {
        setPan({ x: t.clientX - panTouchRef.current.x, y: t.clientY - panTouchRef.current.y });
      }
    } else if (e.touches.length === 2 && touchGestureRef.current?.type === 'pinch') {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const { startDist, startZoom } = touchGestureRef.current;
      setZoom(Math.max(0.08, Math.min(3, startZoom * (Math.hypot(dx, dy) / startDist))));
    }
  }, [getCanvasPos]);

  const handleTouchEnd = useCallback(e => {
    if (e.touches.length === 0) {
      // All fingers lifted — if no drag occurred and was on a node, treat as a tap (select)
      if (!dragMovedRef.current && draggingNodeRef.current) {
        const nodeId = draggingNodeRef.current;
        setSel(s => s === nodeId ? null : nodeId);
      }
      draggingNodeRef.current = null; dnOffsetRef.current = null; panTouchRef.current = null;
      setDraggingNode(null); touchGestureRef.current = null;
    } else if (e.touches.length === 1) {
      // Dropped from 2 fingers to 1 — switch to pan
      const t = e.touches[0];
      panTouchRef.current = { x: t.clientX - pan.x, y: t.clientY - pan.y };
      draggingNodeRef.current = null; dnOffsetRef.current = null;
      setDraggingNode(null); touchGestureRef.current = { type: 'pan' };
    }
  }, [pan]);

  const pick = i => { setItem(i); setSearch(""); setShowDrop(false); setSel(null); setRate(ALL_RECIPES[i]?.default?.rate||1); setPan({x:20,y:20}); setZoom(1); setNodePositions({}); setNodeRotations({}); };
  const onWheel = useCallback(e => { e.preventDefault(); setZoom(z => Math.max(0.08, Math.min(3, z * (e.deltaY>0?0.9:1.1)))); }, []);
  const md = e => { if (!draggingNodeRef.current) { setDrag(true); setDs({x:e.clientX-pan.x,y:e.clientY-pan.y}); } };
  const mm = e => {
    const nodeId = draggingNodeRef.current;
    const offset = dnOffsetRef.current;
    if (nodeId && offset && canvasRef.current) {
      dragMovedRef.current = true;
      const rect = canvasRef.current.getBoundingClientRect();
      const mx = (e.clientX - rect.left - pan.x) / zoom;
      const my = (e.clientY - rect.top - pan.y) / zoom;
      setNodePositions(prev => ({ ...prev, [nodeId]: { x: mx - offset.x, y: my - offset.y } }));
    } else if (drag && ds) {
      setPan({x: e.clientX - ds.x, y: e.clientY - ds.y});
    }
  };
  const mu = () => { setDrag(false); setDs(null); draggingNodeRef.current = null; dnOffsetRef.current = null; setDraggingNode(null); };
  const handleNodeDragStart = useCallback((e, n) => {
    if (!canvasRef.current) return;
    e.stopPropagation();
    dragMovedRef.current = false;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = (e.clientX - rect.left - pan.x) / zoom;
    const my = (e.clientY - rect.top - pan.y) / zoom;
    const nx = nodePositions[n.id]?.x ?? n.x;
    const ny = nodePositions[n.id]?.y ?? n.y;
    draggingNodeRef.current = n.id;
    dnOffsetRef.current = { x: mx - nx, y: my - ny };
    setDraggingNode(n.id); // triggers cursor style update
  }, [pan, zoom, nodePositions]);
  useEffect(() => { if(lo) { setZoom(Math.min(1, 680/(lo.W+40))); } }, [lo]);
  const toggleR = (it,rn) => setCh(p => ({...p,[it]:(p[it]||"default")===rn?"default":rn}));

  return (
    <div className="sfp">
      <div className="sfp-wrap">

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 180px", position: "relative" }} ref={dRef}>
            <label style={{ color: "#94a3b8", fontSize: 9, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Target item</label>
            <input value={showDrop ? search : item} onChange={e => { setSearch(e.target.value); setShowDrop(true); }} onFocus={() => { setShowDrop(true); setSearch(""); }}
              style={{ width: "100%", padding: "7px 10px", background: "#151b2b", border: "1px solid #2d3748", borderRadius: 6, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
            {showDrop && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "#151b2b", border: "1px solid #2d3748", borderRadius: 6, maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
              {filt.map(i => <div key={i} onClick={() => pick(i)} style={{ padding: "5px 10px", cursor: "pointer", fontSize: 12, color: i === item ? "#fbbf24" : "#cbd5e1" }}
                onMouseEnter={e => e.target.style.background="rgba(255,255,255,0.04)"} onMouseLeave={e => e.target.style.background="transparent"}>
                {i} {getAlts(i).length > 0 && <span style={{ color: "#fbbf24", fontSize: 9 }}>+{getAlts(i).length}</span>}
              </div>)}
            </div>}
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <label style={{ color: "#94a3b8", fontSize: 9, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: 2 }}>/min</label>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button onPointerDown={e => { e.preventDefault(); setRate(r => Math.max(1, r - 1)); }}
                style={{ width: 28, height: 30, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#fbbf24", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
              <input type="number" value={rate} min={1} step={1} onChange={e => setRate(Math.max(1, parseFloat(e.target.value)||1))}
                style={{ width: "100%", padding: "7px 6px", background: "#151b2b", border: "1px solid #2d3748", borderRadius: 6, color: "#fbbf24", fontSize: 13, fontFamily: "'JetBrains Mono',monospace", outline: "none", boxSizing: "border-box", textAlign: "center", MozAppearance: "textfield" }} />
              <button onPointerDown={e => { e.preventDefault(); setRate(r => r + 1); }}
                style={{ width: 28, height: 30, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#fbbf24", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
            </div>
          </div>
          <button onClick={() => { setCh({}); setRate(ALL_RECIPES[item]?.default?.rate || 1); }} style={{ padding: "7px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>Reset Recipes</button>
          <button onClick={() => { setNodePositions({}); setNodeRotations({}); setPan({ x: 20, y: 20 }); }} style={{ padding: "7px 10px", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#94a3b8", fontSize: 10, cursor: "pointer" }}>Reset Layout</button>
        </div>

        {totals && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 6, marginBottom: 8 }}>
          {[{l:"Machines",v:totals.totalM,c:"#fbbf24"},{l:"Power",v:totals.totalP.toFixed(0)+" MW",c:"#fc8181"},{l:"Foundations",v:totals.fnd,c:"#b794f4"},{l:"Raw",v:Object.keys(totals.raws).length,c:"#68d391"}].map(s =>
            <div key={s.l} style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 8, padding: "6px 10px" }}>
              <div style={{ color: "#64748b", fontSize: 8, textTransform: "uppercase" }}>{s.l}</div>
              <div style={{ color: s.c, fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</div>
            </div>)}
        </div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
          {totals && Object.entries(totals.raws).sort((a,b)=>b[1]-a[1]).map(([r,v]) =>
            <span key={r} style={{ background: "#0f2a1a", border: "1px solid #22543d", borderRadius: 4, padding: "2px 7px", fontSize: 9, color: "#68d391", fontFamily: "'JetBrains Mono',monospace" }}>{r}: {v.toFixed(1)}/m</span>)}
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "0 16px" }}>
        <div ref={canvasRef} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden", height: 480, position: "relative", cursor: draggingNode ? "grabbing" : drag ? "grabbing" : "grab", touchAction: "none", userSelect: "none" }}
          onWheel={onWheel} onMouseDown={md} onMouseMove={mm} onMouseUp={mu} onMouseLeave={mu}
          onClick={e => { if (!dragMovedRef.current) setSel(null); }}
          onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
          <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
            <defs><pattern id="fg" width={F} height={F} patternUnits="userSpaceOnUse" patternTransform={`translate(${pan.x%(F*zoom)},${pan.y%(F*zoom)}) scale(${zoom})`}>
              <rect width={F} height={F} fill="none" stroke="#161e2c" strokeWidth="0.5" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#fg)" />
          </svg>
          {lo && <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0 }}>
            <defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M1 2L8 5L1 8" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" /></marker></defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {mergedEdges.map((e,i) => <PEdge key={i} e={e} />)}
              {mergedNodes.map((n,i) => <MNode key={n.id+i} n={n} sel={sel} onSel={n => setSel(n.id)} onDragStart={handleNodeDragStart} rotation={nodeRotations[n.id] || 0} />)}
            </g>
          </svg>}
          <div style={{ position: "absolute", bottom: 6, right: 8, color: "#3a5570", fontSize: 9, fontFamily: "monospace" }}>{(zoom*100).toFixed(0)}%</div>
          {!sel && <div style={{ position: "absolute", top: 8, left: 10, color: "#3a5570", fontSize: 9, fontFamily: "monospace" }}>Click a node with alts to swap recipe</div>}
        </div>

        {/* Node info / Alt recipe panel */}
        {sel && lo && (() => {
          const node = mergedNodes.find(n => n.id === sel) || lo.nodes.find(n => n.id === sel);
          if (!node) return null;
          const alts = getAlts(node.item);
          const active = ch[node.item] || "default";
          const r = getR(node.item, ch);
          const curRot = nodeRotations[node.id] || 0;
          const rotateNode = () => setNodeRotations(prev => ({ ...prev, [node.id]: ((prev[node.id] || 0) + 90) % 360 }));
          return (
            <div style={{ background: "#0d1117", border: "1px solid #2d3748", borderRadius: 8, padding: "12px 16px", marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{node.item}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {!node.raw && MACHINE_FP[node.machine] && (
                    <button onClick={rotateNode} title="Rotate machine layout"
                      style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, cursor: "pointer",
                        fontFamily: "'JetBrains Mono',monospace", border: "1px solid #4a5568",
                        background: "#1e293b", color: "#94a3b8" }}>
                      ↻ {curRot}°
                    </button>
                  )}
                  <span style={{ color: "#4a5568", fontSize: 9, fontFamily: "monospace" }}>click canvas to dismiss</span>
                </div>
              </div>
              {alts.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {["default", ...alts].map(rn => {
                    const rec = ALL_RECIPES[node.item]?.[rn];
                    const isActive = active === rn;
                    const tierCol = rec?.tier ? TIER_COL[rec.tier] : null;
                    return (
                      <button key={rn} onClick={e => { e.stopPropagation(); toggleR(node.item, rn); }}
                        style={{
                          padding: "5px 10px", borderRadius: 6, fontSize: 10, cursor: "pointer",
                          fontFamily: "'JetBrains Mono',monospace", fontWeight: 600,
                          border: `1px solid ${isActive ? "#fbbf24" : "#2d3748"}`,
                          background: isActive ? "rgba(251,191,36,0.12)" : "#151b2b",
                          color: isActive ? "#fbbf24" : "#94a3b8",
                        }}>
                        {rn === "default" ? "Default" : rn}
                        {tierCol && <span style={{ marginLeft: 5, color: tierCol, fontSize: 9 }}>[{rec.tier}]</span>}
                        {isActive && <span style={{ marginLeft: 5, color: "#fbbf24" }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {r && !r.raw && (
                <div style={{ fontSize: 9, color: "#4a5568", fontFamily: "monospace" }}>
                  {r.inputs.map(([inp, qty]) => `${qty}x ${inp}`).join(" + ")} → {r.output}x {node.item} · {r.rate}/min · {r.machine}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
