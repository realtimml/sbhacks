"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "orbital_entity_id";

export function useEntityId() {
  const [entityId, setEntityId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing entity ID in localStorage
    let id = localStorage.getItem(STORAGE_KEY);

    if (!id) {
      // Generate a new UUID for this entity
      id = uuidv4();
      localStorage.setItem(STORAGE_KEY, id);
    }

    setEntityId(id);
    setIsLoading(false);
  }, []);

  // Reset entity ID (useful for testing different accounts)
  const resetEntityId = () => {
    const newId = uuidv4();
    localStorage.setItem(STORAGE_KEY, newId);
    setEntityId(newId);
    return newId;
  };

  return { entityId, isLoading, resetEntityId };
}

