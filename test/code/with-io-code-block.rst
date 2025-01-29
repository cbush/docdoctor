=============================
Page title with io-code-block
=============================

Save the file, and then compile and run your project to create the index:

.. io-code-block::
   :copyable: true

   .. input::

      dotnet run MyCompany.Embeddings

   .. output::

      New search index named vector_index is building.
      Polling to check if the index is ready. This may take up to a minute.
      vector_index is ready for querying.

And maybe some more text afterward.

It's also possible for the io-code-block to transclude files. Maybe an example
of that would be good...

.. io-code-block::
   :copyable: true

   .. input::

      dotnet run MyCompany.Embeddings.csproj

   .. output:: /includes/output-existing-open-source-csharp.sh
      :language: shell
