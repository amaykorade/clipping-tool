"use client";

import { useReducer } from "react";

// ---- Types ----

export interface TranscriptWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

export type AspectRatio = "VERTICAL" | "SQUARE" | "LANDSCAPE";
export type CropMode = "FILL" | "FIT";

export interface CaptionLayout {
  positionX: number; // 0-100 percentage from left
  positionY: number; // 0-100 percentage from top
  scale: number;     // 0.5-2.0
  activeColor: string; // hex color for the active/highlighted word
}

export interface EditorState {
  originalStartTime: number;
  originalEndTime: number;
  originalWords: TranscriptWord[];
  startTime: number;
  endTime: number;
  captionStyle: string;
  captionLayout: CaptionLayout;
  aspectRatio: AspectRatio;
  cropMode: CropMode;
  wordEdits: Record<string, string>;
  isPlaying: boolean;
  currentTime: number;
  isDirty: boolean;
  undoStack: EditorAction[];
  redoStack: EditorAction[];
}

// ---- Actions ----

type SetTrimAction = { type: "SET_TRIM"; startTime: number; endTime: number };
type SetCaptionStyleAction = { type: "SET_CAPTION_STYLE"; style: string };
type SetAspectRatioAction = { type: "SET_ASPECT_RATIO"; aspectRatio: AspectRatio };
type SetCropModeAction = { type: "SET_CROP_MODE"; cropMode: CropMode };
type EditWordAction = { type: "EDIT_WORD"; index: string; text: string };
type SetCaptionLayoutAction = { type: "SET_CAPTION_LAYOUT"; layout: CaptionLayout };
type SetPlayingAction = { type: "SET_PLAYING"; isPlaying: boolean };
type SetCurrentTimeAction = { type: "SET_CURRENT_TIME"; time: number };
type UndoAction = { type: "UNDO" };
type RedoAction = { type: "REDO" };
type ResetAction = { type: "RESET" };
type InitAction = { type: "INIT"; data: InitData };

export type EditorAction =
  | SetTrimAction
  | SetCaptionStyleAction
  | SetAspectRatioAction
  | SetCropModeAction
  | SetCaptionLayoutAction
  | EditWordAction
  | SetPlayingAction
  | SetCurrentTimeAction
  | UndoAction
  | RedoAction
  | ResetAction
  | InitAction;

export interface InitData {
  startTime: number;
  endTime: number;
  words: TranscriptWord[];
  captionStyle: string;
  captionLayout: CaptionLayout;
  aspectRatio: AspectRatio;
  cropMode: CropMode;
  wordEdits: Record<string, string>;
}

// ---- Helpers ----

/** Build a reverse action so we can undo. */
function inverseAction(action: EditorAction, state: EditorState): EditorAction {
  switch (action.type) {
    case "SET_TRIM":
      return { type: "SET_TRIM", startTime: state.startTime, endTime: state.endTime };
    case "SET_CAPTION_STYLE":
      return { type: "SET_CAPTION_STYLE", style: state.captionStyle };
    case "SET_ASPECT_RATIO":
      return { type: "SET_ASPECT_RATIO", aspectRatio: state.aspectRatio };
    case "SET_CROP_MODE":
      return { type: "SET_CROP_MODE", cropMode: state.cropMode };
    case "SET_CAPTION_LAYOUT":
      return { type: "SET_CAPTION_LAYOUT", layout: { ...state.captionLayout } };
    case "EDIT_WORD":
      return {
        type: "EDIT_WORD",
        index: action.index,
        text: state.wordEdits[action.index] ?? "",
      };
    default:
      return action;
  }
}

// ---- Reducer ----

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "INIT": {
      const { data } = action;
      return {
        originalStartTime: data.startTime,
        originalEndTime: data.endTime,
        originalWords: data.words,
        startTime: data.startTime,
        endTime: data.endTime,
        captionStyle: data.captionStyle,
        captionLayout: data.captionLayout,
        aspectRatio: data.aspectRatio,
        cropMode: data.cropMode ?? "FILL",
        wordEdits: data.wordEdits,
        isPlaying: false,
        currentTime: data.startTime,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      };
    }

    case "SET_TRIM": {
      const inverse = inverseAction(action, state);
      return {
        ...state,
        startTime: action.startTime,
        endTime: action.endTime,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "SET_CAPTION_STYLE": {
      const inverse = inverseAction(action, state);
      return {
        ...state,
        captionStyle: action.style,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "SET_ASPECT_RATIO": {
      const inverse = inverseAction(action, state);
      return {
        ...state,
        aspectRatio: action.aspectRatio,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "SET_CROP_MODE": {
      const inverse = inverseAction(action, state);
      return {
        ...state,
        cropMode: action.cropMode,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "SET_CAPTION_LAYOUT": {
      const inverse = inverseAction(action, state);
      return {
        ...state,
        captionLayout: action.layout,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "EDIT_WORD": {
      const inverse = inverseAction(action, state);
      const wordEdits = { ...state.wordEdits };
      if (action.text === "") {
        delete wordEdits[action.index];
      } else {
        wordEdits[action.index] = action.text;
      }
      return {
        ...state,
        wordEdits,
        isDirty: true,
        undoStack: [...state.undoStack, inverse],
        redoStack: [],
      };
    }

    case "SET_PLAYING":
      return { ...state, isPlaying: action.isPlaying };

    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.time };

    case "UNDO": {
      if (state.undoStack.length === 0) return state;
      const undoStack = [...state.undoStack];
      const toUndo = undoStack.pop()!;
      // Build the redo (inverse of the undo action against current state)
      const redoEntry = inverseAction(toUndo, state);
      // Apply the undo action directly (without pushing to undoStack)
      const applied = applyEditAction(state, toUndo);
      return {
        ...applied,
        undoStack,
        redoStack: [...state.redoStack, redoEntry],
        isDirty: undoStack.length > 0,
      };
    }

    case "REDO": {
      if (state.redoStack.length === 0) return state;
      const redoStack = [...state.redoStack];
      const toRedo = redoStack.pop()!;
      const undoEntry = inverseAction(toRedo, state);
      const applied = applyEditAction(state, toRedo);
      return {
        ...applied,
        undoStack: [...state.undoStack, undoEntry],
        redoStack,
        isDirty: true,
      };
    }

    case "RESET":
      return {
        ...state,
        startTime: state.originalStartTime,
        endTime: state.originalEndTime,
        captionStyle: "modern",
        captionLayout: { positionX: 50, positionY: 85, scale: 1, activeColor: "#c084fc" },
        aspectRatio: "VERTICAL",
        cropMode: "FILL",
        wordEdits: {},
        isDirty: false,
        undoStack: [],
        redoStack: [],
      };

    default:
      return state;
  }
}

/** Apply an edit action without touching undo/redo stacks. */
function applyEditAction(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_TRIM":
      return { ...state, startTime: action.startTime, endTime: action.endTime };
    case "SET_CAPTION_STYLE":
      return { ...state, captionStyle: (action as SetCaptionStyleAction).style };
    case "SET_ASPECT_RATIO":
      return { ...state, aspectRatio: (action as SetAspectRatioAction).aspectRatio };
    case "SET_CROP_MODE":
      return { ...state, cropMode: (action as SetCropModeAction).cropMode };
    case "SET_CAPTION_LAYOUT":
      return { ...state, captionLayout: (action as SetCaptionLayoutAction).layout };
    case "EDIT_WORD": {
      const a = action as EditWordAction;
      const wordEdits = { ...state.wordEdits };
      if (a.text === "") {
        delete wordEdits[a.index];
      } else {
        wordEdits[a.index] = a.text;
      }
      return { ...state, wordEdits };
    }
    default:
      return state;
  }
}

// ---- Hook ----

const INITIAL_STATE: EditorState = {
  originalStartTime: 0,
  originalEndTime: 0,
  originalWords: [],
  startTime: 0,
  endTime: 0,
  captionStyle: "modern",
  captionLayout: { positionX: 50, positionY: 85, scale: 1, activeColor: "#c084fc" },
  aspectRatio: "VERTICAL",
  cropMode: "FILL",
  wordEdits: {},
  isPlaying: false,
  currentTime: 0,
  isDirty: false,
  undoStack: [],
  redoStack: [],
};

export function useEditorState(initialData?: InitData): [EditorState, React.Dispatch<EditorAction>] {
  const initial: EditorState = initialData
    ? {
        originalStartTime: initialData.startTime,
        originalEndTime: initialData.endTime,
        originalWords: initialData.words,
        startTime: initialData.startTime,
        endTime: initialData.endTime,
        captionStyle: initialData.captionStyle,
        captionLayout: initialData.captionLayout,
        aspectRatio: initialData.aspectRatio,
        cropMode: initialData.cropMode ?? "FILL",
        wordEdits: initialData.wordEdits,
        isPlaying: false,
        currentTime: initialData.startTime,
        isDirty: false,
        undoStack: [],
        redoStack: [],
      }
    : INITIAL_STATE;

  return useReducer(editorReducer, initial);
}
