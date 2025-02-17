import React, { FormEventHandler, useEffect, useRef, useState } from "react";
import { isAWord } from "../utilities/word-service";
import { useAppDispatch, useAppSelector } from "../store";
import Keyboard, { BACKSPACE, SUBMIT } from "./Keyboard";
import Spinner from "./Spinner";
import Victory from "./Victory";
import { CharacterStatus, WordStatus } from "../utilities/types";
import gameSlice from "../store/gameSlice";

const SIZE = 5;
const PATTERN = "^[a-zA-Z]*$";

const Game: React.FC<{
  answer: string;
}> = ({ answer }) => {
  const answerState = useAppSelector((state) => state.game.answers[answer]);
  const guesses = answerState?.guesses ?? [];
  const eliminatedLetters = answerState?.eliminatedLetters ?? [];
  const foundLetters = answerState?.foundLetters ?? [];
  const won = answerState?.won ?? false;

  const dispatch = useAppDispatch();
  const handleSubmitGuess = (guess: string) => {
    dispatch(
      gameSlice.actions.submitGuess({
        guess,
        answer,
      })
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        paddingTop: 20,
      }}
    >
      {!won && (
        <div>
          <button onClick={() => handleSubmitGuess(answer)}>
            Just tell me the answer
          </button>
        </div>
      )}
      {guesses.map((guess, index) => (
        <WordResult key={index} guessStatus={guess} />
      ))}
      {won ? (
        <Victory guesses={guesses} answer={answer} />
      ) : (
        <Guess
          key={guesses.length}
          onSubmitGuess={handleSubmitGuess}
          eliminatedLetters={eliminatedLetters}
          foundLetters={foundLetters}
        />
      )}
    </div>
  );
};

const Guess: React.FC<{
  onSubmitGuess: (guess: string) => void;
  eliminatedLetters: string[];
  foundLetters: string[];
}> = ({ onSubmitGuess, eliminatedLetters, foundLetters }) => {
  const [guess, _setGuess] = useState("");
  const setGuess = (g: string) => _setGuess(g.substring(0, SIZE));
  const [submitting, setSubmitting] = useState(false);
  const guessesMustBeValidWords = useAppSelector(
    (state) => state.settings.guessesMustBeValidWords
  );

  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const handleSubmit: FormEventHandler = async () => {
    if (submitting) return false;
    setSubmitting(true);

    if (!formRef.current?.checkValidity()) {
      alert("Invalid form");
    } else {
      const errorMessage = await asyncValidation(guess);
      inputRef.current?.setCustomValidity(errorMessage || "");
      if (!errorMessage) {
        onSubmitGuess(guess);
      } else {
        inputRef.current?.reportValidity();
        formRef.current?.requestSubmit();
      }
    }

    setSubmitting(false);
    return false;
  };
  const asyncValidation = async (value: string) => {
    if (guessesMustBeValidWords && !(await isAWord(value)))
      return `"${value}" is not an English word`;
  };

  useEffect(() => {
    inputRef.current?.setCustomValidity(realTimeValidation(guess));
  }, [guess]);
  const realTimeValidation = (value: string) => {
    if (value.length < SIZE)
      return `Too short, must be more than ${SIZE} characters`;
    if (value.length > SIZE)
      return `Too long, must be less than ${SIZE} characters`;
    if (!new RegExp(PATTERN).test(value)) return "Only letters are allowed";
    return "";
  };

  const handleTypeLetter = (letter: string) => {
    switch (letter) {
      case BACKSPACE:
        setGuess(guess.substring(0, guess.length - 1));
        break;
      case SUBMIT:
        formRef.current?.requestSubmit();
        break;
      default:
        setGuess(guess + letter);
        break;
    }
  };

  return (
    <React.Fragment>
      <form ref={formRef} onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          placeholder="Guess"
          disabled={submitting}
          type="text"
          title="Only letters are allowed"
          required={true}
          pattern={PATTERN}
          minLength={SIZE}
          maxLength={SIZE}
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
        />
        {submitting && <Spinner size={15} />}
        <button disabled={submitting} type="submit">
          Submit
        </button>
      </form>
      <Keyboard
        disabledLetters={eliminatedLetters}
        highlightedLetters={foundLetters}
        onTypeLetter={handleTypeLetter}
      />
    </React.Fragment>
  );
};

const WordResult: React.FC<{
  guessStatus: WordStatus;
}> = ({ guessStatus }) => {
  const getColor = (status: CharacterStatus) => {
    if (status.inWord) {
      return status.inPosition ? "green" : "yellow";
    }
  };

  return (
    <div style={{ display: "flex", maxWidth: 100 }}>
      {guessStatus.map((status, index) => (
        <div
          key={index}
          style={{
            backgroundColor: getColor(status),
            flex: 1,
            minWidth: 12,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {status.character}
        </div>
      ))}
    </div>
  );
};

export default Game;
