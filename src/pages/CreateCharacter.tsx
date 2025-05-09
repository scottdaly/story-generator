import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

interface CharacterDetails {
  name: string;
  gender: string;
  backstory: string;
}

function CreateCharacter() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const genre = searchParams.get("genre");

  const [character, setCharacter] = useState<CharacterDetails>({
    name: "",
    gender: "Other",
    backstory: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setCharacter({ ...character, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!character.name.trim()) {
      setError("Please enter a character name.");
      return;
    }
    if (!character.gender) {
      setError("Please select a gender.");
      return;
    }
    if (
      character.backstory.trim().length < 10 &&
      character.backstory.trim().length > 0
    ) {
      setError("Backstory should be at least 10 characters, or left empty.");
      return;
    }

    console.log("Character Created:", character);

    navigate(`/play?genre=${genre}`, { state: { character } });
  };

  if (!genre) {
    return (
      <div className="p-4 text-red-500">
        Error: Genre parameter is missing. Please select a genre from the home
        page.
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4 sm:pt-8 text-gray-800 p-4">
      <h1 className="text-3xl font-bold mb-4">Create Your {genre} Character</h1>
      {error && (
        <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow-md"
      >
        <div className="mb-4">
          <label htmlFor="name" className="block text-gray-700 font-bold mb-2">
            Character Name:
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={character.name}
            onChange={handleChange}
            className="w-full p-3 border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your character's name"
            required
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="gender"
            className="block text-gray-700 font-bold mb-2"
          >
            Gender:
          </label>
          <div className="flex gap-2">
            {["Male", "Female", "Other"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCharacter({ ...character, gender: option })}
                className={`flex-1 py-2 px-4 rounded-lg transition duration-300 ease-in-out cursor-pointer ${
                  character.gender === option
                    ? "bg-blue-500 text-white"
                    : "border border-zinc-500/50 text-zinc-700 hover:bg-blue-50"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label
            htmlFor="backstory"
            className="block text-gray-700 font-bold mb-2"
          >
            Backstory (Optional):
          </label>
          <textarea
            id="backstory"
            name="backstory"
            value={character.backstory}
            onChange={handleChange}
            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Describe your character's past... (min. 10 characters if provided)"
            rows={4}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
        >
          Start Adventure!
        </button>
      </form>
    </div>
  );
}

export default CreateCharacter;
