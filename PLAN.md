# Cleanup tasks

Both the manifest file and the c4Ref are no longer valuable. Our approach is to continue to allow the parentRef on a node. Once these have been persisted in the database we are able to transverse the graph, therefore we understand the entire graph without the need for the manifest and c4ref. Plan this out. We should remove these from test data too
