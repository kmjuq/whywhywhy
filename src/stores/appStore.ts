import { defineStore } from "pinia";
import { ref } from "vue";

export const useAppStore = defineStore("app", () => {
  const capturedText = ref("");
  const questionTags = ref<string[]>([]);
  const knowledgeBackground = ref("");
  const selectedQuestion = ref("");
  const answer = ref("");
  const isLoading = ref(false);

  const setCapturedText = (text: string) => {
    capturedText.value = text;
  };

  const setQuestionTags = (tags: string[]) => {
    questionTags.value = tags;
  };

  const setKnowledgeBackground = (background: string) => {
    knowledgeBackground.value = background;
  };

  const setSelectedQuestion = (question: string) => {
    selectedQuestion.value = question;
  };

  const setAnswer = (text: string) => {
    answer.value = text;
  };

  const setIsLoading = (loading: boolean) => {
    isLoading.value = loading;
  };

  const clearAnswer = () => {
    answer.value = "";
  };

  const clearKnowledgeBackground = () => {
    knowledgeBackground.value = "";
  };

  return {
    capturedText,
    questionTags,
    knowledgeBackground,
    selectedQuestion,
    answer,
    isLoading,
    setCapturedText,
    setQuestionTags,
    setKnowledgeBackground,
    setSelectedQuestion,
    setAnswer,
    setIsLoading,
    clearAnswer,
    clearKnowledgeBackground,
  };
});
