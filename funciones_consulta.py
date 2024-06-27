from flask import Flask, render_template, request, redirect, url_for
import os
import pandas as pd
import openai
import tiktoken
import numpy as np
import scipy.spatial as spatial
import re
EMBEDDING_MODEL = 'text-embedding-ada-002'
GPT_MODEL = 'gpt-3.5-turbo'
DATA_DIR = 'data'
openai.api_key = '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'


# Función para listar los archivos en el directorio de datos
def list_files(directory: str) -> list:
    return [f for f in os.listdir(directory) if f.endswith(".txt")]

# Función para contar tokens
def num_tokens(text: str, model: str = EMBEDDING_MODEL) -> int:
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

# Función para generar embeddings y filtrar el DataFrame
def filter_dataframe_by_filenames(df: pd.DataFrame, filenames: list) -> pd.DataFrame:
    filtered_df = df[df["filename"].isin(filenames)].copy()
    filtered_df.drop(columns=["filename"], inplace=True)
    return filtered_df

# Función para clasificar las strings por relevancia usando embeddings
def strings_ranked_by_relatedness(query: str, df: pd.DataFrame, top_n: int = 5, threshold: float = 0.76) -> list[tuple[str, float]]:
    query_embedding_response = openai.Embedding.create(model=EMBEDDING_MODEL, input=query)
    query_embedding = query_embedding_response['data'][0]['embedding']
    strings_and_relatednesses = []
    
    for _, row in df.iterrows():
        text_embedding = row["embedding"]
        # Asegurarse de que los embeddings sean arrays de numpy
        text_embedding = np.array(text_embedding)
        query_embedding = np.array(query_embedding)
        relatedness = 1 - spatial.distance.cosine(query_embedding, text_embedding)
        strings_and_relatednesses.append((row["text"], relatedness))
        
    strings_and_relatednesses.sort(key=lambda x: x[1], reverse=True)
    valid_sections = [(s, r) for s, r in strings_and_relatednesses if r >= threshold]
    return valid_sections[:top_n]

# Función para crear el mensaje de consulta
def query_message(query: str, df: pd.DataFrame, model: str, token_budget: int, threshold: float = 0.76) -> str:
    valid_sections = strings_ranked_by_relatedness(query, df, threshold=threshold)
    if len(valid_sections) == 0:
        return "No cuento con esa información, por favor contactar a servicio a cliente."
    introduction = 'Use the below articles to answer the subsequent question. If the answer cannot be found in the articles, write "I could not find an answer."'
    question = f"\n\nQuestion: {query}"
    message = introduction
    for string, relatedness in valid_sections:
        next_article = f'\n\nText section:\n"""\n{string}\n"""'
        if num_tokens(message + next_article + question, model=model) > token_budget:
            break
        else:
            message += next_article
    return message + question

# Función para hacer la consulta a GPT
def ask(query: str, df: pd.DataFrame, model: str = GPT_MODEL, token_budget: int = 4096 - 500, print_message: bool = False, threshold: float = 0.76) -> str:
    message = query_message(query, df, model=model, token_budget=token_budget, threshold=threshold)
    if message == "No cuento con esa información, por favor contactar a servicio a cliente.":
        return message
    if print_message:
        print(message)
    messages = [
        {"role": "system", "content": "You answer questions based on the provided articles."},
        {"role": "user", "content": message},
    ]
    response = openai.ChatCompletion.create(model=model, messages=messages, temperature=0)
    formatted_response = response['choices'][0]['message']['content']
    # Formatear la respuesta directamente aquí
    formatted_response = formatted_response.replace('Wialon', 'Quamtum')
    # Formatea los números seguidos de puntos y espacios a números seguidos de puntos y saltos de línea
    formatted_response = re.sub(r'(\d+)\.\s+', r'\1. ', formatted_response)
    formatted_response = formatted_response.replace('\n', '\n')
    return formatted_response
