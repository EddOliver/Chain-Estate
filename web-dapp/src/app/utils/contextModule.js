'use client';
import React, { createContext, useState } from "react";

// Create context
const ContextModule = createContext();

const defaultState = { page: 0, data: [] };

// Context Provider Component
const ContextProvider = ({ children }) => {
  // Define all the values you want to use in the context
  const [state, setStateValue] = useState(defaultState);
  const setState = (newValue) => {
    setStateValue({
      ...state,
      ...newValue,
    });
  };

  return (
    <ContextModule.Provider value={{ state, setState }}>
      {children}
    </ContextModule.Provider>
  );
};

export { ContextProvider };
export const ContextConsumer = ContextModule.Consumer;
export default ContextModule;
