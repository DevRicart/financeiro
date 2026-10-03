import sys
from copy import copy

import pytest
from django.core.cache import cache

if sys.version_info >= (3, 14):
    # Django 5.1 predates Python 3.14, where `copy(super())` stopped working.
    # The test client copies every template context it renders during a request,
    # so any view that renders a template (the e-mails) crashed under test.
    # This is the fix later Django releases shipped; it only touches the tests.
    from django.template.context import BaseContext

    def _copy_base_context(self):
        duplicate = BaseContext()
        duplicate.__class__ = self.__class__
        duplicate.__dict__ = copy(self.__dict__)
        duplicate.dicts = self.dicts[:]
        return duplicate

    BaseContext.__copy__ = _copy_base_context


@pytest.fixture(autouse=True)
def _clear_cache():
    # DRF throttle counters live in the cache and would otherwise leak between
    # tests: every request in the suite comes from the same 127.0.0.1.
    cache.clear()
    yield
    cache.clear()
