=======================================
Page title with literal include on page
=======================================

Create a new class in a same-named file named ``AIService.cs`` and paste
the following code. This code defines an async Task named
``GetEmbeddingsAsync`` to generate a array of embeddings for an array
of given string inputs. This function uses the `mxbai-embed-large-v1
<https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1>`__ embedding model.

.. literalinclude:: /includes/AIService-GetEmbeddingsAsync-Open-Source.cs
   :language: csharp
   :copyable:
   :caption: AIService.cs

And let's have some more content after the literal include.