"""
Pytest conftest.

Les suites de tests existantes sont des tests d'intégration qui appellent
un backend déployé via REACT_APP_BACKEND_URL. Si cette variable n'est pas
définie (cas du CI sans déploiement), on skippe proprement la collection
au lieu de générer 10 erreurs de connexion.
"""
import os
import pytest


def pytest_collection_modifyitems(config, items):
    backend_url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if backend_url:
        return
    skip_reason = (
        "REACT_APP_BACKEND_URL non configurée — tests d'intégration skippés. "
        "Définir cette variable dans le CI pour cibler un backend de test."
    )
    skip_marker = pytest.mark.skip(reason=skip_reason)
    for item in items:
        item.add_marker(skip_marker)
